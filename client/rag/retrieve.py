from typing import Tuple, List, Dict, Optional

from llm.openai_client import get_embedding
from rag.vector_store import search_vectors
from rag.mmr import mmr_select

from chatbot.query_rewriter import rewrite_query
from chatbot.query_expander import expand_query
from chatbot.prompt_builder import detect_meta_command, detect_detail_mode

from utils.logging import get_logger

logger = get_logger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: expand meta-command into broad sweeping queries
# Defined BEFORE retrieve_chunks so it's always in scope.
# ─────────────────────────────────────────────────────────────────────────────

def _expand_meta_query(meta: str, question: str) -> List[str]:
    """
    For meta-commands, use hand-crafted broad queries instead of Groq expansion.
    These sweep wide across the document rather than targeting a specific topic.
    Groq would return unhelpful expansions for commands like "quiz me" or "summarise my notes".

    Also handles chapter/topic-specific commands by including the original question
    so the chapter name/number is embedded alongside the broad sweep.
    """
    # Always include the original question so chapter/topic references are captured
    base = [question]

    if meta == "summarise":
        return base + [
            "main topics overview introduction",
            "key points definitions concepts explained",
            "conclusion summary findings results",
        ]
    elif meta == "key_concepts":
        return base + [
            "definition concept theory principle",
            "important terms vocabulary explained",
            "formula equation method process steps",
        ]
    elif meta == "quiz":
        return base + [
            "main concepts definitions key facts",
            "important points questions answers topics",
            "examples applications problems solutions",
        ]
    elif meta == "study_plan":
        return base + [
            "topics covered chapters sections",
            "concepts difficulty complexity breakdown",
            "definitions examples applications",
        ]
    elif meta == "notes":
        return base + [
            "main topics key concepts definitions",
            "important points explained with examples",
            "formulas methods procedures steps",
        ]
    else:
        return base


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: retrieval config based on query type
# ─────────────────────────────────────────────────────────────────────────────

def _get_retrieval_config(question: str) -> Dict:
    """
    Returns top_k, mmr_top_k, and score_threshold based on query type.

    | Query type         | top_k | mmr_top_k | score_threshold |
    |--------------------|-------|-----------|-----------------|
    | Normal question    |   8   |     5     |      0.5        |
    | Detail / elaborate |  15   |    10     |      0.3        |
    | Meta-command       |  20   |    15     |      0.0        |

    score_threshold=0.0 for meta/detail means we take everything Pinecone returns
    and let MMR handle diversity filtering. This is critical for broad commands
    like "summarise my notes" where query-chunk similarity is naturally lower.
    """
    meta = detect_meta_command(question)
    is_detail = detect_detail_mode(question)

    if meta is not None:
        return {"top_k": 20, "mmr_top_k": 15, "score_threshold": 0.0}
    elif is_detail:
        return {"top_k": 15, "mmr_top_k": 10, "score_threshold": 0.3}
    else:
        return {"top_k": 8, "mmr_top_k": 5, "score_threshold": 0.5}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN: retrieve_chunks
# ─────────────────────────────────────────────────────────────────────────────

async def retrieve_chunks(
    question: str,
    session_id: str,
    chat_history: List[Dict] = None
) -> Tuple[str, List[Dict], str]:
    """
    Full retrieval pipeline. Returns (context_string, sources, confidence).

    Steps:
      0. Determine retrieval config (top_k, mmr_top_k, score_threshold)
      1. Rewrite query (skip for meta-commands — rewriting "quiz me" makes it worse)
      2. Expand query (hand-crafted for meta, Groq-powered for normal)
      3. Embed + search Pinecone for each query variant
      4. Deduplicate results
      5. MMR selection for diversity
      6. Build context string + sources + confidence
    """
    try:
        config = _get_retrieval_config(question)
        top_k = config["top_k"]
        mmr_top_k = config["mmr_top_k"]
        score_threshold = config["score_threshold"]

        meta = detect_meta_command(question)
        is_detail = detect_detail_mode(question)

        logger.info(
            f"Retrieval config | top_k={top_k} mmr_top_k={mmr_top_k} "
            f"score_threshold={score_threshold} | meta={meta} detail={is_detail}"
        )

        # Step 1: Query rewrite
        # Skip for meta-commands — "summarise my notes" must not be rewritten
        if meta is None:
            rewritten_question = await rewrite_query(question, chat_history or [])
            logger.info(f"Rewritten query: {rewritten_question}")
        else:
            rewritten_question = question
            logger.info(f"Meta-command ({meta}) — skipping query rewrite")

        # Step 2: Query expansion
        if meta is not None:
            queries = _expand_meta_query(meta, rewritten_question)
            logger.info(f"Meta query expansion ({len(queries)} variants): {queries}")
        else:
            queries = await expand_query(rewritten_question)
            logger.info(f"Groq expanded queries ({len(queries)} variants): {queries}")

        # Step 3: Embed + search each query variant
        all_results = []
        for q in queries:
            logger.info(f"Embedding + searching: '{q[:60]}'")
            query_vector = await get_embedding(q)
            if not query_vector:
                logger.warning(f"Empty embedding returned for query variant: '{q[:60]}'")
                continue

            results = await search_vectors(
                session_id,
                query_vector,
                top_k=top_k,
                score_threshold=score_threshold
            )
            logger.info(f"  → {len(results)} results")
            all_results.extend(results)

        if not all_results:
            logger.info("No relevant chunks found after all query variants.")
            return "", [], "low"

        # Step 4: Deduplicate by text content
        unique_texts = set()
        deduped = []
        for r in all_results:
            text = r.get("text", "")
            if text and text not in unique_texts:
                unique_texts.add(text)
                deduped.append(r)

        logger.info(f"After dedup: {len(deduped)} unique chunks from {len(all_results)} total")

        # Step 5: MMR selection
        # Re-embed the rewritten question for MMR scoring
        query_vector = await get_embedding(rewritten_question)
        mmr_candidates = [r for r in deduped if r.get("vector")]

        if not query_vector or not mmr_candidates:
            # Fallback: take top chunks by score
            selected = sorted(deduped, key=lambda r: r.get("score", 0), reverse=True)[:mmr_top_k]
            logger.info(f"MMR skipped (no vectors) — using top-{mmr_top_k} by score")
        else:
            selected = mmr_select(query_vector, mmr_candidates, top_k=mmr_top_k)
            logger.info(f"MMR selected {len(selected)} diverse chunks")

        # Step 6: Build context string
        context_chunks = [r.get("text", "").strip() for r in selected if r.get("text")]
        context = "\n\n---\n\n".join(context_chunks)

        # Step 7: Build sources list
        sources = [
            {
                "filename": r.get("filename", ""),
                "section": f"Chunk {r.get('chunk_index', -1)}"
            }
            for r in selected
        ]

        # Step 8: Confidence from average similarity score
        scores = [r.get("score", 0) for r in selected]
        avg_score = sum(scores) / len(scores) if scores else 0

        if avg_score >= 0.8:
            confidence = "high"
        elif avg_score >= 0.6:
            confidence = "medium"
        else:
            confidence = "low"

        logger.info(
            f"Retrieval complete | selected={len(selected)} chunks | "
            f"avg_score={avg_score:.3f} | confidence={confidence}"
        )

        return context, sources, confidence

    except Exception as e:
        logger.error(f"Error during retrieval: {e}")
        return "", [], "low"

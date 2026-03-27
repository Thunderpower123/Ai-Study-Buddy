from typing import Tuple, List, Dict

from llm.openai_client import get_embedding
from rag.vector_store import search_vectors
from rag.mmr import mmr_select

from chatbot.query_rewriter import rewrite_query
from chatbot.query_expander import expand_query

from utils.logging import get_logger

logger = get_logger(__name__)


async def retrieve_chunks(
    question: str,
    session_id: str,
    chat_history: List[Dict] = None
) -> Tuple[str, List[Dict], str]:

    try:
        # 🔥 Step 0: Rewrite query (follow-up handling)
        rewritten_question = await rewrite_query(question, chat_history or [])
        logger.info(f"Rewritten query: {rewritten_question}")

        # 🔥 Step 1: Expand query (optional multi-query)
        queries = await expand_query(rewritten_question)

        all_results = []

        # 🔥 Step 2: Retrieve for each query
        for q in queries:
            logger.info(f"Embedding query variant: {q}")
            query_vector = await get_embedding(q)

            if not query_vector:
                continue

            results = await search_vectors(session_id, query_vector, top_k=8)
            all_results.extend(results)

        if not all_results:
            logger.info("No relevant chunks found.")
            return "", [], "low"

        # 🔥 Step 3: Deduplicate (basic)
        unique_texts = set()
        deduped = []

        for r in all_results:
            text = r.get("text", "")
            if text and text not in unique_texts:
                unique_texts.add(text)
                deduped.append(r)

        # 🔥 Step 4: MMR selection
        query_vector = await get_embedding(rewritten_question)

        # Filter out chunks with no vector (can't do MMR without them)
        mmr_candidates = [r for r in deduped if r.get("vector")]

        if not mmr_candidates:
            # Fallback: just take top-5 by score
            selected = sorted(deduped, key=lambda r: r.get("score", 0), reverse=True)[:5]
        else:
            selected = mmr_select(query_vector, mmr_candidates, top_k=5)

        # 🔥 Step 5: Build context
        context_chunks = [r.get("text", "").strip() for r in selected if r.get("text")]

        context = "\n\n---\n\n".join(context_chunks)

        # 🔥 Step 6: Build sources
        sources = [
            {
                "filename": r.get("filename", ""),
                "section": f"Chunk {r.get('chunk_index', -1)}"
            }
            for r in selected
        ]

        # 🔥 Step 7: Better confidence
        scores = [r.get("score", 0) for r in selected]

        avg_score = sum(scores) / len(scores)

        if avg_score >= 0.8:
            confidence = "high"
        elif avg_score >= 0.6:
            confidence = "medium"
        else:
            confidence = "low"

        logger.info(
            f"Selected {len(selected)} chunks | Avg score: {avg_score:.3f} | Confidence: {confidence}"
        )

        return context, sources, confidence

    except Exception as e:
        logger.error(f"Error during retrieval: {e}")
        return "", [], "low"
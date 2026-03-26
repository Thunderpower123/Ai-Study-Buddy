from typing import Tuple, List, Dict

from llm.openai_client import get_embedding
from rag.vector_store import search_vectors
from utils.logging import get_logger

logger = get_logger(__name__)


async def retrieve_chunks(
    question: str,
    session_id: str
) -> Tuple[str, List[Dict], str]:
    """
    Full retrieval pipeline:
        1. Embed question
        2. Search Pinecone
        3. Build context string
        4. Extract sources
        5. Compute confidence

    Returns:
        (
            context_string,
            sources_list,
            confidence_string
        )
    """

    try:
        # Step 1: Generate embedding for question
        logger.info("Generating embedding for query...")
        query_vector = await get_embedding(question)

        if not query_vector:
            logger.warning("Empty query embedding.")
            return "", [], "low"

        # Step 2: Search Pinecone
        results = await search_vectors(session_id, query_vector)

        if not results:
            logger.info("No relevant chunks found.")
            return "", [], "low"

        # Step 3: Build context string
        context_chunks = [r.get("text", "").strip() for r in results if r.get("text")]
        context = "\n\n---\n\n".join(context_chunks)

        # Step 4: Build sources list
        sources = []
        for r in results:
            sources.append({
                "filename": r.get("filename", ""),
                "section": f"Chunk {r.get('chunk_index', -1)}"
            })

        # Step 5: Compute confidence
        top_score = results[0].get("score", 0)

        if top_score >= 0.8:
            confidence = "high"
        elif top_score >= 0.6:
            confidence = "medium"
        else:
            confidence = "low"

        logger.info(
            f"Retrieved {len(results)} chunks | Top score: {top_score:.3f} | Confidence: {confidence}"
        )

        return context, sources, confidence

    except Exception as e:
        logger.error(f"Error during retrieval: {e}")
        return "", [], "low"

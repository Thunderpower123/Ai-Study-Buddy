from typing import List
from utils.logging import get_logger
from llm.openai_client import get_embeddings_batch

logger = get_logger(__name__)

# OpenAI supports up to 2048 inputs per batch call.
# We use 500 to stay well within rate limits and avoid oversized requests.
BATCH_SIZE = 500


async def embed_chunks(chunks: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of text chunks using batch API calls.

    - Sends chunks in batches of BATCH_SIZE (default 500)
    - One API call per batch instead of one per chunk (major speed win)
    - Skips any chunk that returns an empty embedding
    - Returns list of embedding vectors in the same order as input chunks

    Example: 120 chunks → 1 API call instead of 120.
    """
    vectors: List[List[float]] = []
    total = len(chunks)

    for batch_start in range(0, total, BATCH_SIZE):
        batch = chunks[batch_start: batch_start + BATCH_SIZE]
        batch_end = batch_start + len(batch)

        logger.info(f"Embedding batch {batch_start + 1}–{batch_end} of {total} chunks...")

        try:
            batch_vectors = await get_embeddings_batch(batch)

            # batch_vectors is list aligned with batch input
            for i, vec in enumerate(batch_vectors):
                if not vec:
                    logger.warning(f"Empty embedding for chunk {batch_start + i + 1}, skipping.")
                    continue
                vectors.append(vec)

        except Exception as e:
            logger.error(f"Failed to embed batch {batch_start + 1}–{batch_end}: {e}")
            raise  # Let retry / upstream handle

    logger.info(f"Embedding complete: {len(vectors)}/{total} chunks processed.")
    return vectors
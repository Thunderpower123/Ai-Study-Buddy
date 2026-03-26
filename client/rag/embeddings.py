from typing import List
from utils.logging import get_logger
from llm.openai_client import get_embedding

logger = get_logger(__name__)


async def embed_chunks(chunks: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of text chunks.

    - Calls get_embedding() for each chunk
    - Logs progress for visibility
    - Returns list of embedding vectors

    Note:
    Sequential by design (safe for rate limits).
    Can be parallelized later (Tier 2 optimization).
    """
    vectors: List[List[float]] = []

    total = len(chunks)

    for i, chunk in enumerate(chunks, start=1):
        try:
            logger.info(f"Embedding chunk {i}/{total}...")

            embedding = await get_embedding(chunk)

            # Skip empty embeddings (defensive)
            if not embedding:
                logger.warning(f"Empty embedding for chunk {i}, skipping.")
                continue

            vectors.append(embedding)

        except Exception as e:
            logger.error(f"Failed to embed chunk {i}: {e}")
            raise  # Let retry / upstream handle

    logger.info(f"Embedding complete: {len(vectors)}/{total} chunks processed.")

    return vectors
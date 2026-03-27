import asyncio
from typing import List, Dict

from pinecone import Pinecone

from config.settings import settings
from utils.logging import get_logger

logger = get_logger(__name__)

# Initialize Pinecone client + index
pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)


def _build_vector(
    document_id: str,
    session_id: str,
    filename: str,
    chunk_text: str,
    vector: List[float],
    i: int
) -> Dict:
    """
    Builds a single Pinecone vector payload.

    filename is now stored in metadata so source citations in the chat UI
    show the actual file name (e.g. "chapter3.pdf") instead of the MongoDB documentId.
    """
    return {
        "id": f"{document_id}-chunk-{i}",
        "values": vector,
        "metadata": {
            "text": chunk_text,
            "sessionId": session_id,
            "documentId": document_id,
            "filename": filename,
            "chunk_index": i
        }
    }


async def upsert_vectors(
    session_id: str,
    document_id: str,
    filename: str,
    chunks: List[str],
    vectors: List[List[float]]
) -> int:
    """
    Upserts vectors into Pinecone in batches.

    - Namespace = session_id
    - Batch size = 100
    - Returns total vectors upserted
    """
    try:
        if not chunks or not vectors:
            logger.warning("No chunks or vectors provided for upsert.")
            return 0

        if len(chunks) != len(vectors):
            raise ValueError("Chunks and vectors length mismatch.")

        batch_size = 100
        total = len(vectors)
        upserted = 0

        for start in range(0, total, batch_size):
            end = start + batch_size

            batch = [
                _build_vector(document_id, session_id, filename, chunks[i], vectors[i], i)
                for i in range(start, min(end, total))
            ]

            logger.info(
                f"Upserting batch {start}-{min(end, total)-1} "
                f"({len(batch)} vectors) to namespace={session_id}"
            )

            # Run sync Pinecone call in thread
            await asyncio.to_thread(
                index.upsert,
                vectors=batch,
                namespace=session_id
            )

            upserted += len(batch)

        logger.info(f"Upsert complete: {upserted} vectors stored.")

        return upserted

    except Exception as e:
        logger.error(f"Error during vector upsert: {e}")
        raise


async def search_vectors(
    session_id: str,
    query_vector: List[float],
    top_k: int = 5
) -> List[Dict]:
    """
    Searches Pinecone for similar vectors.

    - Namespace = session_id
    - Filters results with score < 0.5
    - Returns structured results
    """
    try:
        logger.info(f"Searching vectors in namespace={session_id} (top_k={top_k})")

        # Run sync Pinecone query in thread
        # response is a QueryResponse object (not a dict) — use attribute access
        response = await asyncio.to_thread(
            index.query,
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
            include_values=True,
            namespace=session_id
        )

        results = []

        # FIX: Pinecone SDK v3+ returns an object, not a dict — use .matches not .get()
        matches = response.matches

        for match in matches:
            score = match.score

            if score < 0.5:
                continue  # filter weak matches

            metadata = match.metadata or {}

            results.append({
                "text": metadata.get("text", ""),
                "filename": metadata.get("filename", ""),
                "score": score,
                "chunk_index": metadata.get("chunk_index", -1),
                "vector": match.values if match.values else []
            })

        logger.info(f"Search complete: {len(results)} results above threshold.")

        return results

    except Exception as e:
        logger.error(f"Error during vector search: {e}")
        return []

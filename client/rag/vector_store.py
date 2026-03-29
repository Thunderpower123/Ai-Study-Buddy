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


async def delete_namespace(session_id: str) -> None:
    """
    Deletes the entire Pinecone namespace for a session.

    Called when a session is deleted. Wipes ALL vectors across ALL documents
    in that session in one shot. Pinecone namespaces are isolated, so this
    does not touch any other session's data.
    """
    try:
        logger.info(f"Deleting Pinecone namespace: {session_id}")

        await asyncio.to_thread(
            index.delete,
            delete_all=True,
            namespace=session_id
        )

        logger.info(f"Namespace deleted: {session_id}")

    except Exception as e:
        logger.error(f"Error deleting namespace {session_id}: {e}")
        raise


async def delete_by_document(session_id: str, document_id: str) -> int:
    """
    Deletes all Pinecone vectors belonging to a specific document.

    Uses a metadata filter on documentId. Only touches vectors in the
    given session namespace — other documents are untouched.

    Returns:
        int: number of vectors deleted (estimated from list before delete).

    Note:
    Pinecone's delete-by-metadata-filter requires a paid plan (P1+).
    For Starter plan compatibility, we list vector IDs by prefix
    (document_id-chunk-*) and delete by ID — safer and works on free tier.
    """
    try:
        logger.info(f"Deleting vectors for document={document_id} in namespace={session_id}")

        # List all vector IDs with this document's prefix
        # Pinecone list() returns paginated results — iterate all pages
        all_ids = []
        prefix = f"{document_id}-chunk-"

        list_response = await asyncio.to_thread(
            index.list,
            prefix=prefix,
            namespace=session_id
        )

        # list() returns a generator of pages; each page has a list of IDs
        for page in list_response:
            all_ids.extend(page)

        if not all_ids:
            logger.warning(f"No vectors found for document={document_id} in namespace={session_id}")
            return 0

        logger.info(f"Found {len(all_ids)} vectors to delete for document={document_id}")

        # Delete in batches of 1000 (Pinecone hard limit per delete call)
        batch_size = 1000
        for start in range(0, len(all_ids), batch_size):
            batch = all_ids[start: start + batch_size]
            await asyncio.to_thread(
                index.delete,
                ids=batch,
                namespace=session_id
            )
            logger.info(f"Deleted batch {start + 1}–{start + len(batch)}")

        logger.info(f"Delete complete: {len(all_ids)} vectors removed for document={document_id}")
        return len(all_ids)

    except Exception as e:
        logger.error(f"Error deleting vectors for document={document_id}: {e}")
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

import base64

from extractor.pdf_extractor import extract_pdf
from extractor.pptx_extractor import extract_pptx
from extractor.docx_extractor import extract_docx
from extractor.chunker import chunk_text

from rag.embeddings import embed_chunks
from rag.vector_store import upsert_vectors

from schemas.ingest import IngestRequest
from utils.logging import get_logger

logger = get_logger(__name__)


async def run_ingest(body: IngestRequest) -> int:
    """
    Full ingestion pipeline:

    1. Decode base64 → bytes
    2. Extract text (PDF / PPTX / DOCX)
    3. Chunk text
    4. Generate embeddings
    5. Upsert vectors to Pinecone (with filename stored in metadata)

    Returns:
        int: number of chunks stored
    """

    try:
        logger.info(
            f"Starting ingest | session={body.sessionId} | document={body.documentId} | file={body.filename}"
        )

        # Step 1: Decode base64 → bytes
        try:
            file_bytes = base64.b64decode(body.file_b64)
        except Exception as e:
            logger.error(f"Failed to decode base64 file: {e}")
            raise ValueError("Invalid base64 file data")

        logger.info("File decoded successfully.")

        # Step 2: Route to correct extractor
        mimetype = body.mimetype

        if mimetype == "application/pdf":
            logger.info("Using PDF extractor.")
            text = extract_pdf(file_bytes)

        elif mimetype == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            logger.info("Using PPTX extractor.")
            text = extract_pptx(file_bytes)

        elif mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            logger.info("Using DOCX extractor.")
            text = extract_docx(file_bytes)

        else:
            logger.error(f"Unsupported mimetype: {mimetype}")
            raise ValueError(f"Unsupported mimetype: {mimetype}")

        if not text or not text.strip():
            logger.warning("No text extracted from document.")
            return 0

        logger.info(f"Text extraction complete. Length: {len(text)} characters.")

        # Step 3: Chunk text
        chunks = chunk_text(text)

        if not chunks:
            logger.warning("Chunking produced no chunks.")
            return 0

        logger.info(f"Chunking complete: {len(chunks)} chunks created.")

        # Step 4: Generate embeddings
        vectors = await embed_chunks(chunks)

        if not vectors:
            logger.warning("Embedding step returned no vectors.")
            return 0

        logger.info(f"Embeddings generated: {len(vectors)} vectors.")

        # Step 5: Upsert to Pinecone
        # FIX: pass body.filename so it's stored in metadata for source citations
        stored_count = await upsert_vectors(
            session_id=body.sessionId,
            document_id=body.documentId,
            filename=body.filename,
            chunks=chunks,
            vectors=vectors
        )

        logger.info(
            f"Ingest complete | Stored {stored_count} chunks for document={body.documentId}"
        )

        return stored_count

    except Exception as e:
        logger.error(f"Ingest pipeline failed: {e}")
        raise

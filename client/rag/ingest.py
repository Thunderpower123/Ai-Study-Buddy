import base64

from extractor.pdf_extractor import extract_pdf
from extractor.pptx_extractor import extract_pptx
from extractor.docx_extractor import extract_docx
from extractor.text_extractor import extract_text
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
    2. Extract text (PDF / PPTX / DOCX / plain text)
    3. [STUB] Groq symbol restoration — add here when ready (Tier 1 polish)
    4. Chunk text
    5. Generate embeddings
    6. Upsert vectors to Pinecone (with filename stored in metadata)

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

        elif mimetype in ("text/plain", "text/markdown"):
            logger.info("Using plain text extractor.")
            text = extract_text(file_bytes)

        else:
            logger.error(f"Unsupported mimetype: {mimetype}")
            raise ValueError(f"Unsupported mimetype: {mimetype}")

        if not text or not text.strip():
            logger.warning("No text extracted from document.")
            return 0

        logger.info(f"Text extraction complete. Length: {len(text)} characters.")

        # Step 3: Groq symbol restoration (Tier 1 polish — add when sessions/upload are wired)
        # Restores corrupted engineering symbols (α, β, ω, Ω, μ) that PyMuPDF mangles.
        # Only needed for PDF — skip for PPTX, DOCX, and plain text.
        # To enable:
        #   from extractor.symbol_restorer import restore_symbols
        #   if mimetype == "application/pdf":
        #       text = await restore_symbols(text)

        # Step 4: Chunk text
        chunks = chunk_text(text)

        if not chunks:
            logger.warning("Chunking produced no chunks.")
            return 0

        logger.info(f"Chunking complete: {len(chunks)} chunks created.")

        # Step 5: Generate embeddings
        # embed_chunks returns one vector per chunk, but skips empty chunks
        # (returns [] for that position). We must align chunks and vectors
        # before upserting — upsert_vectors requires equal-length lists.
        raw_vectors = await embed_chunks(chunks)

        if not raw_vectors:
            logger.warning("Embedding step returned no vectors.")
            return 0

        # Zip and filter: drop any chunk whose embedding came back empty
        aligned = [(c, v) for c, v in zip(chunks, raw_vectors) if v]

        if not aligned:
            logger.warning("All embeddings were empty after filtering.")
            return 0

        aligned_chunks, vectors = zip(*aligned)
        aligned_chunks = list(aligned_chunks)
        vectors = list(vectors)

        if len(aligned_chunks) < len(chunks):
            logger.warning(
                f"{len(chunks) - len(aligned_chunks)} chunks dropped due to empty embeddings."
            )

        logger.info(f"Embeddings generated: {len(vectors)} vectors.")

        # Step 6: Upsert to Pinecone
        stored_count = await upsert_vectors(
            session_id=body.sessionId,
            document_id=body.documentId,
            filename=body.filename,
            chunks=aligned_chunks,
            vectors=vectors
        )

        logger.info(
            f"Ingest complete | Stored {stored_count} chunks for document={body.documentId}"
        )

        return stored_count

    except Exception as e:
        logger.error(f"Ingest pipeline failed: {e}")
        raise

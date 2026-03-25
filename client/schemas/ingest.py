from pydantic import BaseModel


class IngestRequest(BaseModel):
    """
    Shape of the body Node sends to POST /ingest.

    file_b64: The file as a base64 string.
        JSON cannot carry raw binary bytes. Node reads the uploaded file into
        a buffer and converts it to base64 before sending. We decode it back
        to bytes here in Python before passing it to the extractor.

    filename: The original filename e.g. "chapter3.pdf"
        Stored in Pinecone metadata so we can show the student which file
        an answer came from (source citations feature).

    mimetype: e.g. "application/pdf", "application/vnd.openxmlformats..."
        Tells us which extractor to use — PDF, PPTX, or DOCX.
        We could infer from the extension but mimetype is more reliable.

    sessionId: The MongoDB session ID this document belongs to.
        Used as the Pinecone namespace so each session's vectors are isolated.
        When a session is deleted, we delete only its namespace.

    documentId: The MongoDB document ID for this file.
        Stored in Pinecone vector metadata. Lets us delete a specific
        document's vectors without touching the rest of the session.
    """
    file_b64: str
    filename: str
    mimetype: str
    sessionId: str
    documentId: str


class IngestResponse(BaseModel):
    """
    What we send back to Node after ingesting a document.

    success: Whether the pipeline completed without error.
    chunks_stored: How many vectors were upserted into Pinecone.
        Node stores this in the Document MongoDB record (totalChunks field).
        Useful for debugging and for showing the student upload stats.
    """
    success: bool
    chunks_stored: int

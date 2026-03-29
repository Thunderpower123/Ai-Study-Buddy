from pydantic import BaseModel


class IngestRequest(BaseModel):
    """
    Shape of the body Node sends to POST /ingest.

    file_b64: The file as a base64 string.
        JSON cannot carry raw binary bytes. Node reads the uploaded file into
        a buffer and converts it to base64 before sending. We decode it back
        to bytes here in Python before passing it to the extractor.

    filename: The original filename e.g. "chapter3.pdf"
        For pasted raw text, Node sends a generated name like "pasted-notes.txt".
        Stored in Pinecone metadata so we can show the student which file
        an answer came from (source citations feature).

    mimetype: Tells us which extractor to use. Supported values:
        - "application/pdf"                                                  → PDF extractor
        - "application/vnd.openxmlformats-officedocument.presentationml.presentation" → PPTX extractor
        - "application/vnd.openxmlformats-officedocument.wordprocessingml.document"   → DOCX extractor
        - "text/plain"                                                       → plain text extractor
        - "text/markdown"                                                    → plain text extractor
        We use mimetype rather than file extension because it's more reliable
        (extensions can be renamed; mimetype comes from the browser/Node).

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

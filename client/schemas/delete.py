from pydantic import BaseModel


class DeleteNamespaceRequest(BaseModel):
    """
    Body Node sends to POST /delete-namespace when a session is deleted.

    sessionId: The MongoDB session ID whose Pinecone namespace should be wiped.
        Deleting the namespace removes ALL vectors for every document in that session.
        Called by session.controller.js before deleting the Session document.
    """
    sessionId: str


class DeleteNamespaceResponse(BaseModel):
    success: bool
    message: str = ""


class DeleteDocumentRequest(BaseModel):
    """
    Body Node sends to POST /delete when a single document is deleted.

    sessionId:  The Pinecone namespace to operate within.
    documentId: Filters and deletes only vectors whose metadata.documentId
                matches this value. Other documents in the session are untouched.
    """
    sessionId: str
    documentId: str


class DeleteDocumentResponse(BaseModel):
    success: bool
    deleted_count: int = 0
    message: str = ""

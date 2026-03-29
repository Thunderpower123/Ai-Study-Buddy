from fastapi import APIRouter, Request
from schemas.delete import DeleteDocumentRequest, DeleteDocumentResponse
from utils.auth import verify_service_key
from rag.vector_store import delete_by_document
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("/delete", response_model=DeleteDocumentResponse)
async def delete_document_route(request: Request, body: DeleteDocumentRequest):
    """
    Deletes all Pinecone vectors for a specific document.

    Called by Node's document.controller.js on DELETE /api/documents/:id.
    Only removes vectors whose metadata.documentId matches — other documents
    in the same session namespace are completely untouched.

    Uses prefix-based ID listing (document_id-chunk-*) which works on
    Pinecone's free Starter plan. Does not require metadata filter support.
    """
    verify_service_key(request)

    try:
        deleted_count = await delete_by_document(body.sessionId, body.documentId)
        logger.info(
            f"Document vectors deleted: document={body.documentId} "
            f"session={body.sessionId} count={deleted_count}"
        )
        return DeleteDocumentResponse(
            success=True,
            deleted_count=deleted_count,
            message=f"Deleted {deleted_count} vectors for document '{body.documentId}'."
        )
    except Exception as e:
        logger.error(
            f"Failed to delete vectors for document={body.documentId} "
            f"session={body.sessionId}: {e}"
        )
        # Return success=False rather than raising 500 so Node can still
        # proceed with MongoDB Document deletion even if Pinecone fails
        return DeleteDocumentResponse(
            success=False,
            deleted_count=0,
            message=str(e)
        )

from fastapi import APIRouter, Request
from schemas.delete import DeleteNamespaceRequest, DeleteNamespaceResponse
from utils.auth import verify_service_key
from rag.vector_store import delete_namespace
from utils.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("/delete-namespace", response_model=DeleteNamespaceResponse)
async def delete_namespace_route(request: Request, body: DeleteNamespaceRequest):
    """
    Deletes the entire Pinecone namespace for a session.

    Called by Node's session.controller.js on DELETE /api/sessions/:id.
    Wipes all vectors for every document in the session in one shot.

    Node calls this BEFORE deleting the Session document from MongoDB
    so we always have the sessionId available.
    """
    verify_service_key(request)

    try:
        await delete_namespace(body.sessionId)
        logger.info(f"Namespace deleted successfully: {body.sessionId}")
        return DeleteNamespaceResponse(
            success=True,
            message=f"Namespace '{body.sessionId}' deleted."
        )
    except Exception as e:
        logger.error(f"Failed to delete namespace {body.sessionId}: {e}")
        # Return success=False rather than raising 500 so Node can still proceed
        # with MongoDB cleanup even if Pinecone delete fails
        return DeleteNamespaceResponse(
            success=False,
            message=str(e)
        )

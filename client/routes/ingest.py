from fastapi import APIRouter, Request
from schemas.ingest import IngestRequest, IngestResponse
from utils.auth import verify_service_key

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(request: Request, body: IngestRequest):
    """
    Receives a file from Node and runs it through the RAG ingestion pipeline.

    Full pipeline (active when OpenAI key arrives):
        1. Decode base64 file bytes
        2. Route to correct extractor based on mimetype (PDF / PPTX / DOCX)
        3. Groq post-processes extracted text to restore corrupted symbols (α, β, ω)
        4. Chunker splits text into ~500 token chunks with overlap
        5. OpenAI generates an embedding vector for each chunk
        6. All chunks + vectors upserted to Pinecone under sessionId namespace
        7. Return how many chunks were stored

    Today (stub): Verifies the service key and returns a success response with
    0 chunks. This proves port 8001 is alive and Node can reach us.

    Why async: OpenAI and Pinecone calls are network I/O. Async means FastAPI
    can handle other requests while waiting — the port doesn't block.
    """
    verify_service_key(request)

    # TODO: replace with real pipeline when OpenAI key is ready
    # from rag.ingest import run_ingest
    # result = await run_ingest(body)
    # return IngestResponse(success=True, chunks_stored=result.chunks_stored)

    return IngestResponse(success=True, chunks_stored=0)

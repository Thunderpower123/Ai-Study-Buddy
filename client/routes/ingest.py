from fastapi import APIRouter, Request
from schemas.ingest import IngestRequest, IngestResponse
from utils.auth import verify_service_key
from rag.ingest import run_ingest

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(request: Request, body: IngestRequest):
    """
    Receives a file from Node and runs it through the RAG ingestion pipeline.

    Full pipeline:
        1. Decode base64 file bytes
        2. Route to correct extractor based on mimetype (PDF / PPTX / DOCX)
        3. Chunker splits text into ~500 token chunks with overlap
        4. OpenAI generates an embedding vector for each chunk
        5. All chunks + vectors upserted to Pinecone under sessionId namespace
           (filename stored in metadata for source citations)
        6. Return how many chunks were stored

    Switch between STUB and REAL by toggling the two blocks below.
    Once OPENAI_API_KEY is set in .env, delete the stub block and uncomment real.
    """
    verify_service_key(request)

    # ── REAL PIPELINE (uncomment when OPENAI_API_KEY is configured) ──────────
    result = await run_ingest(body)
    return IngestResponse(success=True, chunks_stored=result)

    # ── STUB (delete these 3 lines once you switch to real above) ────────────
    # return IngestResponse(success=True, chunks_stored=0)

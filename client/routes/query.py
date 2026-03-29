from fastapi import APIRouter, Request
from schemas.query import QueryRequest, QueryResponse
from utils.auth import verify_service_key
from chatbot.chat_service import run_chat

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query(request: Request, body: QueryRequest):
    """
    Receives a student's question and returns an AI answer.

    Full pipeline:
        1. Generate embedding vector for the question using OpenAI
        2. Search Pinecone for top 5 most similar chunks in the sessionId namespace
        3. Extract source citations (filename, section) from Pinecone metadata
        4. Calculate confidence score from similarity scores
        5. Detect mode: scan question for extended-mode keywords
           ("explain further", "give me an example", "simplify", etc.)
        6. Build system prompt with: userProfile + retrieved chunks + mode instruction
        7. Call gpt-4o-mini with the prompt + question
        8. Return answer with sources and confidence

    Switch between STUB and REAL by toggling the two blocks below.
    Once OPENAI_API_KEY is set in .env, delete the stub block and uncomment real.
    """
    verify_service_key(request)

    # ── REAL PIPELINE (uncomment when OPENAI_API_KEY is configured) ──────────
    result = await run_chat(body)
    return result

    # ── STUB (delete these 7 lines once you switch to real above) ────────────
    # return QueryResponse(
    #     success=True,
    #     answer="Stub response — OpenAI key not yet configured. The pipeline will be wired in shortly.",
    #     mode="grounded",
    #     sources=[],
    #     confidence="low"
    # )

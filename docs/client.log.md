# AI Study Buddy — Python Client Dev Log

> This document is updated every session. It is the single source of truth
> for what was built, why every decision was made, and what comes next.
> Written by Priyangshu. Started: March 25, 2026.

---

## Project Context

Two teammates. Priyangshu owns the Python client (port 8001) and parts of
the Node backend. Teammate owns the rest of the Node backend and all frontend.

Three services talk to each other:
- React Frontend → port 5173 (Vercel)
- Node.js Backend → port 8000 (Render)
- Python Client → port 8001 (Render) ← THIS REPO

**Golden rule:** Frontend never talks to the Python client. Everything goes
through Node. The Python client only accepts requests that carry the correct
SERVICE_KEY header — a shared secret between Node and Python.

---

## March 25, 2026 — Day 3 — Setting Up the Python Client

### What we are doing today

OpenAI API key is not available yet (arrives in ~2 days). So today's goal is:

1. Get port 8001 running
2. Wire up all three endpoints with stubs (no real AI yet)
3. Enforce the SERVICE_KEY check from day one
4. Let the Node backend connect and verify the two services can talk

This is called "stubbing" — you build the shape of the system before the
real logic goes in. Every endpoint returns a fake response today, but the
contract (what goes in, what comes out) is locked in permanently.

### Folder structure and why each file exists
```
client/
├── main.py              → FastAPI app entry point. Creates the app, mounts routes, runs uvicorn.
├── config/
│   └── settings.py      → Reads .env once. Every other file imports env vars from here —
│                          never from os.getenv() scattered everywhere.
├── routes/
│   ├── ingest.py        → Handles POST /ingest. Receives file from Node, triggers RAG pipeline.
│   └── query.py         → Handles POST /query. Receives question, returns AI answer.
├── schemas/
│   ├── ingest.py        → Pydantic model: what shape of data /ingest expects.
│   └── query.py         → Pydantic model: what shape of data /query expects and returns.
├── rag/
│   ├── ingest.py        → RAG upload phase: extract → chunk → embed → store in Pinecone.
│   ├── embeddings.py    → Calls OpenAI to generate embedding vectors.
│   ├── retrieve.py      → Queries Pinecone, returns top-k chunks.
│   └── vector_store.py  → All Pinecone operations: upsert, query, delete.
├── extractor/
│   ├── pdf_extractor.py  → PyMuPDF text extraction from PDF files.
│   ├── pptx_extractor.py → python-pptx text extraction from PPTX files.
│   ├── docx_extractor.py → python-docx text extraction from DOCX files.
│   └── chunker.py        → Splits extracted text into ~500 token chunks with overlap.
├── chatbot/
│   ├── chat_service.py  → Orchestrates the full chat flow: retrieve → build prompt → call GPT.
│   └── prompt_builder.py→ Assembles the system prompt with userProfile + chunks + mode.
├── llm/
│   └── openai_client.py → Thin wrapper around OpenAI SDK. Used for embeddings and chat.
├── cache/               → Redis operations. Caches last 10 messages and recent chunk context.
└── utils/
    ├── auth.py          → SERVICE_KEY verifier. Called at the top of every route.
    └── logging.py       → Structured logging setup. One place, imported everywhere.
```

### Why FastAPI and not Flask

Flask is simpler to start but FastAPI gives us:
- Automatic request validation via Pydantic (we define a schema, bad requests are rejected automatically)
- Auto-generated /docs page at localhost:8001/docs — lets you test endpoints in the browser
- Native async support — matters when calling OpenAI, Pinecone, and Redis concurrently
- Type hints everywhere — code is self-documenting

### Why config/settings.py exists

Every service (routes, rag, chatbot, llm) needs env vars. Without settings.py, you'd
write os.getenv("OPENAI_API_KEY") in five different files. If the variable name ever
changes, you'd miss one. settings.py reads everything once using Pydantic BaseSettings,
validates that required vars exist, and exposes them as a typed `settings` object.

### Why SERVICE_KEY verification is in utils/auth.py

Every route must check it. If you put the check inside each route function, you'd
eventually forget it on a new route. A single verify_service_key() function in one
file means you import it once and call it once per route. One place to change if the
auth logic ever evolves.

### Why stubs before real logic

The Node backend needs to call /ingest and /query today to confirm ports and headers
work. If we waited for OpenAI, nothing could be tested end-to-end for 2 more days.
Stubs let integration testing start immediately. The shape of every response is finalized
now — Node's code won't need to change when we swap stubs for real AI.

---

## What the endpoints receive and return (the contract)

### POST /ingest
```
Headers: x-service-key: <SERVICE_KEY>

Body (sent by Node):
{
  "file_b64": "<base64 encoded file bytes>",
  "filename": "chapter3.pdf",
  "mimetype": "application/pdf",
  "sessionId": "abc123",
  "documentId": "xyz789"
}

Response:
{
  "success": true,
  "chunks_stored": 42
}
```

### POST /query
```
Headers: x-service-key: <SERVICE_KEY>

Body (sent by Node):
{
  "question": "What is Fleming's left hand rule?",
  "sessionId": "abc123",
  "userProfile": {
    "branch": "Electrical Engineering",
    "year": 2,
    "interests": ["circuits", "machines"]
  }
}

Response:
{
  "success": true,
  "answer": "Fleming's left hand rule states...",
  "mode": "grounded",
  "sources": [{"filename": "chapter3.pdf", "section": "Page 12"}],
  "confidence": "high"
}
```

### POST /generate-notes
```
Headers: x-service-key: <SERVICE_KEY>

Body:
{
  "sessionId": "abc123",
  "highlights": [...],
  "fileType": "pdf"
}

Response:
{
  "success": true,
  "file_b64": "<base64 of generated file>",
  "filename": "Study_Notes.pdf"
}
```

---

## Environment Variables (client/.env)

| Variable              | Status         | Purpose                          |
|-----------------------|----------------|----------------------------------|
| SERVICE_KEY           | Set today      | Shared secret with Node backend  |
| GROQ_API_KEY          | Get today free | Symbol restoration + scanning    |
| OPENAI_API_KEY        | In 2 days      | Embeddings + GPT-4o-mini chat    |
| PINECONE_API_KEY      | In 2 days      | Vector database                  |
| PINECONE_INDEX_NAME   | In 2 days      | Which Pinecone index to use      |
| UPSTASH_REDIS_URL     | In 2 days      | Redis cache URL                  |
| UPSTASH_REDIS_TOKEN   | In 2 days      | Redis auth token                 |

---

## What comes next (Day 4–5, when OpenAI key arrives)

In this exact order:
1. `llm/openai_client.py` — initialize OpenAI SDK
2. `rag/embeddings.py` — call OpenAI to generate vectors
3. `rag/vector_store.py` — Pinecone upsert and query
4. `extractor/pdf_extractor.py` — PyMuPDF extraction
5. `extractor/chunker.py` — split text into ~500 token chunks
6. `rag/ingest.py` — wire extraction → chunking → embedding → Pinecone
7. `routes/ingest.py` — replace stub with real ingest call
8. `rag/retrieve.py` — query Pinecone, return top-k chunks
9. `chatbot/prompt_builder.py` — assemble system prompt
10. `chatbot/chat_service.py` — full chat orchestration
11. `routes/query.py` — replace stub with real query call

---

## Rules we will never break

- Frontend never talks to this service directly
- Every endpoint verifies SERVICE_KEY before doing anything
- Never commit .env
- Never push venv/
- Write RAG logic ourselves — no LangChain
- Never generate fake diagrams (misleads students studying for exams)
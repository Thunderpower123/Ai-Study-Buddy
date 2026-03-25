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
- Python Client → port 8001 (Render) ← THIS SERVICE

**Golden rule:** Frontend never talks to the Python client. Everything goes
through Node. The Python client only accepts requests that carry the correct
SERVICE_KEY header — a shared secret between Node and Python.

---

## March 25, 2026 — Day 3 — Setting Up the Python Client

### Goal for today

OpenAI API key is not available yet (arrives in ~2 days). So today's goal is:

1. Get port 8001 running
2. Wire up all three endpoints with stubs (no real AI yet)
3. Enforce the SERVICE_KEY check from day one
4. Let the Node backend connect and verify the two services can talk

This is called "stubbing" — you build the shape of the system before the
real logic goes in. Every endpoint returns a fake response today, but the
contract (what goes in, what comes out) is locked in permanently. Node's
code will not need to change at all when stubs are replaced with real AI.

---

## Folder Structure and Why Each File Exists

```
client/
├── main.py               → FastAPI app entry point. Creates the app, mounts routes.
├── config/
│   └── settings.py       → Reads .env once. Every other file imports from here.
│                           Never use os.getenv() scattered across files.
├── routes/
│   ├── ingest.py         → Handles POST /ingest. Receives file from Node.
│   └── query.py          → Handles POST /query. Receives question, returns answer.
├── schemas/
│   ├── ingest.py         → Pydantic model: shape of data /ingest expects.
│   └── query.py          → Pydantic model: shape of data /query expects and returns.
├── rag/
│   ├── ingest.py         → RAG upload: extract → chunk → embed → Pinecone upsert.
│   ├── embeddings.py     → Calls OpenAI to generate embedding vectors.
│   ├── retrieve.py       → Queries Pinecone, returns top-k matching chunks.
│   └── vector_store.py   → All Pinecone operations: upsert, query, delete.
├── extractor/
│   ├── pdf_extractor.py  → PyMuPDF text extraction from PDF.
│   ├── pptx_extractor.py → python-pptx text extraction from PPTX.
│   ├── docx_extractor.py → python-docx text extraction from DOCX.
│   └── chunker.py        → Splits extracted text into ~500 token chunks with overlap.
├── chatbot/
│   ├── chat_service.py   → Orchestrates full chat: retrieve → prompt → GPT answer.
│   └── prompt_builder.py → Assembles system prompt with userProfile + chunks + mode.
├── llm/
│   └── openai_client.py  → Thin wrapper around OpenAI SDK.
├── cache/                → Redis operations. Caches messages and chunk context.
└── utils/
    ├── auth.py           → SERVICE_KEY verifier. Called at top of every route.
    ├── logging.py        → Structured logging setup. One place, imported everywhere.
    └── retry.py          → Retry logic for OpenAI and Pinecone network calls.
```

---

## Why These Technology Choices

### Why FastAPI and not Flask

Flask is simpler to start but FastAPI gives:
- Automatic request validation via Pydantic — bad requests are rejected before your code runs
- Auto-generated /docs page at localhost:8001/docs — test endpoints in the browser instantly
- Native async support — matters when calling OpenAI, Pinecone, Redis concurrently
- Type hints everywhere — the code documents itself

### Why config/settings.py exists

Without it, you'd write os.getenv("OPENAI_API_KEY") in five different files.
If a variable name changes, you miss one. settings.py reads everything once using
Pydantic BaseSettings, validates required vars exist on startup, and exposes a typed
`settings` object. One import, everywhere.

### Why SERVICE_KEY verification lives in utils/auth.py

Every route must check it. If the check lived inside each route function, you'd
eventually forget it on a new route. A single verify_service_key() function means
one place to change if auth logic ever evolves.

### Why stubs before real logic

The Node backend needs to call /ingest and /query today to confirm ports and headers
work. Stubs let integration testing start immediately. The shape of every response is
finalized now — Node will not need to change when stubs are replaced with real AI.

---

## Endpoint Contracts (The Permanent API Shape)

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

Why base64: JSON cannot carry binary bytes. Node converts the file buffer to a
base64 string before sending. Python decodes it back to bytes before processing.

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

Why userProfile in the query body: The prompt builder injects it into the GPT
system prompt so answers are tailored to the student's academic level. This is
the primary differentiator from NotebookLM, which treats every user identically.

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
| OPENAI_API_KEY        | In ~2 days     | Embeddings + GPT-4o-mini chat    |
| PINECONE_API_KEY      | In ~2 days     | Vector database                  |
| PINECONE_INDEX_NAME   | In ~2 days     | Which Pinecone index to use      |
| UPSTASH_REDIS_URL     | In ~2 days     | Redis cache URL                  |
| UPSTASH_REDIS_TOKEN   | In ~2 days     | Redis auth token                 |

GROQ_API_KEY is free from console.groq.com — get it today. No billing needed.
You can wire up symbol restoration (Groq post-processes extracted text) even
before OpenAI arrives.

---

## Files Written on March 25, 2026

- config/settings.py       ← reads and validates all env vars
- utils/auth.py            ← SERVICE_KEY verifier (new file, created today)
- schemas/ingest.py        ← IngestRequest + IngestResponse Pydantic models
- schemas/query.py         ← QueryRequest + QueryResponse + Source + UserProfile
- routes/ingest.py         ← POST /ingest stub
- routes/query.py          ← POST /query stub
- main.py                  ← FastAPI app, mounts routes, /health endpoint
- docs/CLIENT_LOG.md       ← this file

---

## What Comes Next (Day 4–5, When OpenAI Key Arrives)

Fill in this exact order — each one depends on the one before:

1. `llm/openai_client.py`       — initialize OpenAI SDK with settings.OPENAI_API_KEY
2. `rag/embeddings.py`          — call OpenAI to generate 1536-dimension vectors
3. `rag/vector_store.py`        — Pinecone upsert and query operations
4. `extractor/pdf_extractor.py` — PyMuPDF text extraction
5. `extractor/chunker.py`       — split text into ~500 token chunks with overlap
6. `rag/ingest.py`              — wire extraction → chunking → embedding → Pinecone
7. `routes/ingest.py`           — replace stub with real ingest call
8. `rag/retrieve.py`            — query Pinecone, return top-k chunks + metadata
9. `chatbot/prompt_builder.py`  — assemble system prompt with userProfile + chunks
10. `chatbot/chat_service.py`   — full chat orchestration + mode detection
11. `routes/query.py`           — replace stub with real query call

---

## Rules We Will Never Break

- Frontend never talks to this service directly
- Every endpoint verifies SERVICE_KEY before doing anything else
- Never commit .env to git
- Never push venv/ to git
- Write RAG logic ourselves — no LangChain
- Never generate fake AI diagrams (actively misleads students studying for exams)
- Never return internet image links for diagrams (that exact diagram won't exist online)
- Come to Claude immediately when stuck — do not sit on a problem for hours alone

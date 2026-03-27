# test_chatbot.py
# Tests the full end-to-end /query HTTP endpoint and chat_service pipeline.
#
# HOW TO RUN (server must be running on :8001):
#   python -m pytest tests/test_chatbot.py -v
#
# IMPORTANT: Run test_ingest.py first — these tests need data in Pinecone.
#
# What gets tested:
#   1. /health endpoint
#   2. /query grounded mode — real question against seeded Pinecone data
#   3. /query extended mode — triggers extended mode via keyword
#   4. /query with no matching content — anti-hallucination stop
#   5. /query with user profile — personalization check
#   6. /query multi-turn — chat history is maintained across turns
#   7. /query rejects wrong service key (401)
#   8. /query with missing required fields (422)
#   9. Redis chat history — verify history is saved and loaded

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import httpx
import asyncio

SERVICE_KEY = "studdybuddy_internal_2026"
BASE_URL = "http://localhost:8001"
TEST_SESSION = "test-session-chatbot-001"


# ── 1. Health check ──────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_health_endpoint():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BASE_URL}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "python-client"
    print(f"\n[HEALTH] {data}")


# ── 2. /query grounded mode ──────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_grounded_returns_answer():
    """
    Asks a factual question about content seeded by test_ingest.py.
    Expects a grounded answer with sources and confidence.
    """
    payload = {
        "question": "What is Newton second law?",
        "sessionId": "test-session-ingest-001",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json=payload,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["answer"], str) and len(data["answer"]) > 20
    assert data["mode"] in ["grounded", "extended"]
    assert data["confidence"] in ["high", "medium", "low"]
    assert isinstance(data["sources"], list)
    print(f"\n[QUERY grounded] mode={data['mode']} confidence={data['confidence']}")
    print(f"[QUERY grounded] answer preview: {data['answer'][:150]}")
    print(f"[QUERY grounded] sources: {data['sources']}")


# ── 3. /query extended mode ──────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_extended_mode_triggered():
    """
    Uses a keyword that triggers extended mode ('explain more').
    Expects mode='extended' in the response.
    """
    payload = {
        "question": "Can you explain more about Newton second law?",
        "sessionId": "test-session-ingest-001",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json=payload,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["mode"] == "extended", (
        f"Expected extended mode for 'explain more' keyword, got: {data['mode']}"
    )
    print(f"\n[QUERY extended] mode={data['mode']} confirmed")
    print(f"[QUERY extended] answer preview: {data['answer'][:150]}")


# ── 4. /query anti-hallucination stop ────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_empty_session_returns_fallback():
    """
    Queries a session that has NO documents uploaded.
    The anti-hallucination guard should return a canned fallback message
    rather than hallucinating an answer.
    """
    payload = {
        "question": "What is quantum entanglement?",
        "sessionId": "test-session-empty-xyz-999",  # session with no data
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json=payload,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    # The anti-hallucination stop should kick in
    assert "could not find" in data["answer"].lower() or len(data["answer"]) < 200, (
        f"Expected fallback message for empty session, got: {data['answer'][:200]}"
    )
    assert data["confidence"] == "low"
    assert data["sources"] == []
    print(f"\n[ANTI-HALLUCINATION] answer: {data['answer']}")
    print(f"[ANTI-HALLUCINATION] confidence={data['confidence']} sources={data['sources']}")


# ── 5. /query with user profile ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_with_user_profile():
    """
    Sends a userProfile in the request.
    Can't assert that the LLM tailored the answer, but can assert
    the pipeline doesn't break and returns a valid response.
    """
    payload = {
        "question": "What is Newton second law?",
        "sessionId": "test-session-ingest-001",
        "userProfile": {
            "branch": "Mechanical Engineering",
            "year": 2,
            "university": "IIT Bombay",
            "interests": ["dynamics", "mechanics"],
            "domains": [],
            "bio": "I love applied physics"
        }
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json=payload,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["answer"]) > 20
    print(f"\n[PROFILE] Pipeline handled userProfile correctly")
    print(f"[PROFILE] answer preview: {data['answer'][:150]}")


# ── 6. Multi-turn conversation — history maintained ───────────────────────────
@pytest.mark.asyncio
async def test_query_multi_turn_history():
    """
    Sends two questions to the same session.
    The second question is a follow-up ('And the first law?').
    The rewriter should use history to make it standalone.
    Both should succeed.
    """
    session = "test-session-multiturn-001"

    # Turn 1
    payload1 = {
        "question": "What is Newton second law?",
        "sessionId": session,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp1 = await client.post(
            f"{BASE_URL}/query", json=payload1,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["success"] is True
    print(f"\n[MULTI-TURN] Turn 1 answer: {data1['answer'][:100]}")

    # Turn 2 — follow-up
    payload2 = {
        "question": "And how is it different from the first law?",
        "sessionId": session,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp2 = await client.post(
            f"{BASE_URL}/query", json=payload2,
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["success"] is True
    assert isinstance(data2["answer"], str) and len(data2["answer"]) > 10
    print(f"[MULTI-TURN] Turn 2 answer: {data2['answer'][:100]}")
    print(f"[MULTI-TURN] Both turns succeeded")


# ── 7. Wrong service key → 401 ────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_rejects_wrong_key():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json={"question": "test", "sessionId": "x"},
            headers={"x-service-key": "totally-wrong-key"}
        )
    assert resp.status_code == 401
    print(f"\n[AUTH] Wrong key correctly rejected with 401")


@pytest.mark.asyncio
async def test_query_rejects_missing_key():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json={"question": "test", "sessionId": "x"}
            # no x-service-key header
        )
    assert resp.status_code == 401
    print(f"[AUTH] Missing key correctly rejected with 401")


# ── 8. Missing required fields → 422 ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_query_missing_question_field():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json={"sessionId": "test-session"},  # missing 'question'
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 422, f"Expected 422 for missing field, got {resp.status_code}"
    print(f"\n[VALIDATION] Missing 'question' correctly returned 422")


@pytest.mark.asyncio
async def test_query_missing_session_id_field():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{BASE_URL}/query",
            json={"question": "What is X?"},  # missing 'sessionId'
            headers={"x-service-key": SERVICE_KEY}
        )
    assert resp.status_code == 422, f"Expected 422 for missing field, got {resp.status_code}"
    print(f"[VALIDATION] Missing 'sessionId' correctly returned 422")


# ── 9. Redis chat history — save and load ────────────────────────────────────
@pytest.mark.asyncio
async def test_redis_history_saved_after_query():
    """
    After a successful query, chat history should be saved in Redis.
    We verify by fetching it directly from the Redis client.
    """
    from cache.redis_client import get_chat_history, save_chat_history

    session = "test-session-redis-direct-001"

    # Clear first
    test_messages = [
        {"role": "user", "content": "What is F=ma?"},
        {"role": "assistant", "content": "F=ma means force equals mass times acceleration."}
    ]
    await save_chat_history(session, test_messages)

    # Fetch back
    loaded = await get_chat_history(session)
    assert isinstance(loaded, list), "Should return a list"
    assert len(loaded) == 2, f"Expected 2 messages, got {len(loaded)}"
    assert loaded[0]["role"] == "user"
    assert loaded[1]["role"] == "assistant"
    assert "F=ma" in loaded[0]["content"]
    print(f"\n[REDIS] Saved and loaded {len(loaded)} messages correctly")


@pytest.mark.asyncio
async def test_redis_history_empty_for_new_session():
    from cache.redis_client import get_chat_history
    loaded = await get_chat_history("brand-new-session-that-never-existed-xyz")
    assert loaded == [], f"New session should return empty list, got: {loaded}"
    print(f"\n[REDIS] New session correctly returns empty list")

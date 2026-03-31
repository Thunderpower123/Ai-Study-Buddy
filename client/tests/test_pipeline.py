# test_pipeline.py
# Full end-to-end pipeline test: Node backend (port 8000) -> Python client (port 8001)
#
# Tests the COMPLETE request chain that the browser triggers:
#   Browser -> Node /api -> Python /query or /ingest -> Pinecone -> OpenAI -> back
#
# HOW TO RUN (BOTH servers must be running):
#   Terminal 1:  cd backend && npm run dev
#   Terminal 2:  cd client && venv\Scripts\activate && uvicorn main:app --reload --port 8001
#   Terminal 3:  cd client && venv\Scripts\activate && python -m pytest tests/test_pipeline.py -v -s
#
# Each test registers a fresh user so tests are isolated and re-runnable.

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import httpx
import asyncio
import time

NODE_URL    = "http://localhost:8000"
PY_URL      = "http://localhost:8001"
SERVICE_KEY = "studdybuddy_internal_2026"


# ── helpers ───────────────────────────────────────────────────────────────────

def unique_email():
    """Unique email per test run so each test creates a fresh user."""
    return f"pipeline_{int(time.time() * 1000)}@test.com"


def make_pdf_bytes(lines: list) -> bytes:
    """Builds a minimal in-memory PDF from a list of text lines."""
    from reportlab.pdfgen import canvas
    from io import BytesIO
    buf = BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in lines:
        c.drawString(72, y, line)
        y -= 20
    c.save()
    return buf.getvalue()


# ── 1. Health checks ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_01_python_client_health():
    """Python client must be reachable."""
    async with httpx.AsyncClient(timeout=5) as c:
        resp = await c.get(f"{PY_URL}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "python-client"
    print(f"\n[HEALTH] Python: {data}")


@pytest.mark.asyncio
async def test_02_node_backend_health():
    """Node backend must be reachable."""
    async with httpx.AsyncClient(timeout=5) as c:
        resp = await c.get(f"{NODE_URL}/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "backend"
    print(f"\n[HEALTH] Node: {data}")


# ── 2. Auth: register -> login -> /me ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_03_auth_register_login_me():
    """Full auth cycle: register -> login -> verify /me."""
    email = unique_email()
    async with httpx.AsyncClient(timeout=15) as c:
        reg = await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Auth Test", "email": email, "age": 21, "password": "testpass123"
        })
        assert reg.status_code == 201, f"Register failed: {reg.text}"
        assert reg.json()["data"]["email"] == email
        print(f"\n[AUTH] Registered: {email}")

        login = await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })
        assert login.status_code == 200, f"Login failed: {login.text}"
        assert "accessToken" in login.cookies
        print(f"[AUTH] Login OK, cookies: {list(login.cookies.keys())}")

        me = await c.get(f"{NODE_URL}/api/users/me")
        assert me.status_code == 200, f"/me failed: {me.text}"
        assert me.json()["user"]["email"] == email
        print(f"[AUTH] /me OK: {me.json()['user']['name']}")


# ── 3. Student details -> isProfileComplete ───────────────────────────────────

@pytest.mark.asyncio
async def test_04_student_details_sets_profile_complete():
    """Saving student details must flip isProfileComplete=true on User."""
    email = unique_email()
    async with httpx.AsyncClient(timeout=15) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "SD Test", "email": email, "age": 19, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        # Before saving — should be false
        me_before = await c.get(f"{NODE_URL}/api/users/me")
        assert me_before.json()["user"]["isProfileComplete"] is False
        print(f"\n[ONBOARDING] Before: isProfileComplete=False")

        sd = await c.post(f"{NODE_URL}/api/student-details", json={
            "education": "UG", "stream": "Engineering",
            "yearOfPassing": 2026, "courseBranch": "Computer Science",
            "interests": ["Machine Learning"]
        })
        assert sd.status_code == 200, f"student-details failed: {sd.text}"

        # After saving — must be true
        me_after = await c.get(f"{NODE_URL}/api/users/me")
        assert me_after.json()["user"]["isProfileComplete"] is True
        print(f"[ONBOARDING] After:  isProfileComplete=True")


# ── 4. Session CRUD ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_05_session_crud():
    """Create -> get -> list -> delete a session."""
    email = unique_email()
    async with httpx.AsyncClient(timeout=15) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Sess Test", "email": email, "age": 20, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        create = await c.post(f"{NODE_URL}/api/sessions")
        assert create.status_code == 201, f"createSession failed: {create.text}"
        sid = create.json()["data"]["_id"]
        print(f"\n[SESSION] Created: {sid}")

        lst = await c.get(f"{NODE_URL}/api/sessions")
        assert any(s["_id"] == sid for s in lst.json()["data"])
        print(f"[SESSION] Listed {len(lst.json()['data'])} session(s)")

        get_one = await c.get(f"{NODE_URL}/api/sessions/{sid}")
        assert get_one.status_code == 200
        assert get_one.json()["data"]["_id"] == sid
        print(f"[SESSION] Get-by-ID OK")

        delr = await c.delete(f"{NODE_URL}/api/sessions/{sid}")
        assert delr.status_code == 200
        print(f"[SESSION] Deleted OK")

        lst2 = await c.get(f"{NODE_URL}/api/sessions")
        assert not any(s["_id"] == sid for s in lst2.json()["data"])
        print(f"[SESSION] Confirmed gone from list")


# ── 5. Document upload -> Pinecone ingest ────────────────────────────────────

@pytest.mark.asyncio
async def test_06_document_upload_ingest_delete():
    """
    Uploads a real PDF through Node:
      Node multipart -> ingest.service.js base64 -> Python /ingest -> Pinecone
    Verifies totalChunks > 0 (vectors stored) and delete cleans up.
    """
    email = unique_email()
    async with httpx.AsyncClient(timeout=120) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Doc Test", "email": email, "age": 22, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        create = await c.post(f"{NODE_URL}/api/sessions")
        sid = create.json()["data"]["_id"]
        print(f"\n[UPLOAD] Session: {sid}")

        pdf = make_pdf_bytes([
            "Newton second law: F = ma.",
            "Force equals mass times acceleration.",
            "Acceleration is rate of change of velocity.",
            "Mass is the amount of matter in an object.",
            "This is classical mechanics.",
        ])

        upload = await c.post(
            f"{NODE_URL}/api/sessions/{sid}/documents",
            files={"files": ("physics.pdf", pdf, "application/pdf")}
        )
        assert upload.status_code == 201, f"Upload failed: {upload.text}"
        docs = upload.json()["data"]["documents"]
        assert len(docs) >= 1
        assert docs[0]["totalChunks"] > 0, (
            f"totalChunks={docs[0]['totalChunks']} — vectors not stored in Pinecone"
        )
        doc_id = docs[0]["_id"]
        print(f"[UPLOAD] Stored: {docs[0]['filename']} | chunks={docs[0]['totalChunks']}")

        lst = await c.get(f"{NODE_URL}/api/sessions/{sid}/documents")
        assert any(d["_id"] == doc_id for d in lst.json()["data"])
        print(f"[UPLOAD] Listed in documents endpoint")

        delr = await c.delete(f"{NODE_URL}/api/documents/{doc_id}")
        assert delr.status_code == 200
        print(f"[UPLOAD] Deleted OK")

        lst2 = await c.get(f"{NODE_URL}/api/sessions/{sid}/documents")
        assert lst2.json()["data"] == []
        print(f"[UPLOAD] Confirmed empty after delete")


# ── 6. Full chat pipeline (grounded) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_07_chat_pipeline_grounded():
    """
    Full pipeline:
      register -> login -> create session -> upload PDF ->
      send chat (Node -> Python /query -> Pinecone -> OpenAI) ->
      verify answer + sources + confidence + mode ->
      verify history saved in MongoDB
    """
    email = unique_email()
    async with httpx.AsyncClient(timeout=180) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Chat Test", "email": email, "age": 22, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        sid = (await c.post(f"{NODE_URL}/api/sessions")).json()["data"]["_id"]
        print(f"\n[CHAT] Session: {sid}")

        pdf = make_pdf_bytes([
            "Newton second law: F = ma.",
            "Force equals mass times acceleration.",
            "Mass is the amount of matter in an object.",
            "Acceleration is the rate of change of velocity.",
        ])
        upload = await c.post(
            f"{NODE_URL}/api/sessions/{sid}/documents",
            files={"files": ("physics.pdf", pdf, "application/pdf")}
        )
        assert upload.status_code == 201, f"Upload failed: {upload.text}"
        chunks = upload.json()["data"]["documents"][0]["totalChunks"]
        print(f"[CHAT] PDF uploaded. Pinecone chunks: {chunks}")

        # Give Pinecone a moment to index
        await asyncio.sleep(3)

        msg = await c.post(
            f"{NODE_URL}/api/chat/{sid}",
            json={"content": "What is Newton second law?", "mode": "grounded"}
        )
        assert msg.status_code == 200, f"Chat failed: {msg.text}"
        d = msg.json()["data"]

        print(f"[CHAT] answer:     {d['answer'][:150]}")
        print(f"[CHAT] confidence: {d['confidence']} | mode: {d['mode']}")
        print(f"[CHAT] sources:    {d['sources']}")

        assert isinstance(d["answer"], str) and len(d["answer"]) > 20, "Answer should not be empty"
        assert d["mode"] in ["grounded", "extended"], f"Bad mode: {d['mode']}"
        assert d["confidence"] in ["high", "medium", "low"], f"Bad confidence: {d['confidence']}"
        assert isinstance(d["sources"], list), "sources should be a list"

        # Verify history persisted in MongoDB
        hist = await c.get(f"{NODE_URL}/api/chat/{sid}")
        assert hist.status_code == 200
        history = hist.json()["data"]
        assert len(history) >= 2, f"Expected >=2 messages, got {len(history)}"
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"
        assert "Newton" in history[0]["content"] or "newton" in history[0]["content"]
        print(f"[CHAT] History in MongoDB: {len(history)} messages saved")


# ── 7. Mode toggle: 'general' -> extended prompt ──────────────────────────────

@pytest.mark.asyncio
async def test_08_chat_general_mode_returns_extended():
    """
    When the frontend sends mode='general', the Python client must
    use the extended system prompt and return mode='extended'.
    """
    email = unique_email()
    async with httpx.AsyncClient(timeout=180) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Mode Test", "email": email, "age": 20, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        sid = (await c.post(f"{NODE_URL}/api/sessions")).json()["data"]["_id"]

        pdf = make_pdf_bytes([
            "Photosynthesis converts light energy into chemical energy.",
            "It occurs in the chloroplasts of plant cells.",
            "The light-dependent reactions occur in the thylakoid membrane.",
        ])
        await c.post(
            f"{NODE_URL}/api/sessions/{sid}/documents",
            files={"files": ("bio.pdf", pdf, "application/pdf")}
        )
        await asyncio.sleep(3)

        msg = await c.post(
            f"{NODE_URL}/api/chat/{sid}",
            json={"content": "What is photosynthesis?", "mode": "general"}
        )
        assert msg.status_code == 200, f"Chat failed: {msg.text}"
        d = msg.json()["data"]
        print(f"\n[MODE TOGGLE] mode returned: {d['mode']}")
        print(f"[MODE TOGGLE] answer: {d['answer'][:120]}")

        assert d["mode"] == "extended", (
            f"Expected mode='extended' when frontend sends mode='general', got '{d['mode']}'"
        )


# ── 8. Anti-hallucination: empty session returns fallback ────────────────────

@pytest.mark.asyncio
async def test_09_chat_empty_session_no_hallucination():
    """
    Sending a message to a session with no documents must NOT hallucinate.
    The anti-hallucination guard in chat_service.py should return a canned response.
    """
    email = unique_email()
    async with httpx.AsyncClient(timeout=60) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Anti-Halluc Test", "email": email, "age": 20, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })

        sid = (await c.post(f"{NODE_URL}/api/sessions")).json()["data"]["_id"]

        # Send message to a session with NO documents
        msg = await c.post(
            f"{NODE_URL}/api/chat/{sid}",
            json={"content": "What is quantum entanglement?", "mode": "grounded"}
        )
        assert msg.status_code == 200, f"Chat failed: {msg.text}"
        d = msg.json()["data"]
        print(f"\n[ANTI-HALLUC] answer: {d['answer']}")
        print(f"[ANTI-HALLUC] confidence: {d['confidence']} | sources: {d['sources']}")

        assert d["confidence"] == "low", "Empty session should return confidence=low"
        assert d["sources"] == [], "Empty session should have no sources"
        assert len(d["answer"]) < 300, "Should return a short fallback, not a hallucinated essay"


# ── 9. Profile save and get ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_10_profile_save_and_get():
    """PUT /api/profile -> GET /api/profile roundtrip."""
    email = unique_email()
    async with httpx.AsyncClient(timeout=15) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "Profile Test", "email": email, "age": 23, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "testpass123"
        })
        await c.post(f"{NODE_URL}/api/student-details", json={
            "education": "UG", "stream": "Engineering",
            "yearOfPassing": 2026, "courseBranch": "Computer Science"
        })

        save = await c.put(f"{NODE_URL}/api/profile", json={
            "branch": "CSE", "year": 3, "university": "IIT Delhi",
            "bio": "I love coding",
            "interests": ["Machine Learning", "Web Dev"],
            "domains": ["Backend"],
            "linkedinUrl": "linkedin.com/in/test",
            "githubUrl": "github.com/test"
        })
        assert save.status_code == 200, f"PUT /profile failed: {save.text}"
        print(f"\n[PROFILE] Saved OK")

        get = await c.get(f"{NODE_URL}/api/profile")
        assert get.status_code == 200
        p = get.json()["data"]["userProfile"]
        assert p["university"] == "IIT Delhi"
        assert p["bio"] == "I love coding"
        assert "Machine Learning" in p["interests"]
        print(f"[PROFILE] Got: university={p['university']} | interests={p['interests']}")


# ── 10. Change password ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_11_change_password():
    """Old password stops working; new password works after change."""
    email = unique_email()
    async with httpx.AsyncClient(timeout=15) as c:
        await c.post(f"{NODE_URL}/api/users/register", json={
            "name": "PW Test", "email": email, "age": 20, "password": "oldpassword1"
        })
        await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "oldpassword1"
        })

        change = await c.put(f"{NODE_URL}/api/users/change-password", json={
            "currentPassword": "oldpassword1", "newPassword": "newpassword2"
        })
        assert change.status_code == 200, f"change-password failed: {change.text}"
        print(f"\n[PASSWORD] Changed successfully")

        new_login = await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "newpassword2"
        })
        assert new_login.status_code == 200
        print(f"[PASSWORD] New password login: OK")

        old_login = await c.post(f"{NODE_URL}/api/users/login", json={
            "email": email, "password": "oldpassword1"
        })
        assert old_login.status_code == 401
        print(f"[PASSWORD] Old password correctly rejected 401")


# ── 11. Protected routes reject unauthenticated ───────────────────────────────

@pytest.mark.asyncio
async def test_12_protected_routes_require_auth():
    """All protected routes must return 401 with no cookie."""
    async with httpx.AsyncClient(timeout=10) as c:
        routes = [
            ("GET",  f"{NODE_URL}/api/users/me"),
            ("GET",  f"{NODE_URL}/api/sessions"),
            ("POST", f"{NODE_URL}/api/sessions"),
            ("GET",  f"{NODE_URL}/api/profile"),
            ("GET",  f"{NODE_URL}/api/student-details"),
        ]
        print()
        for method, url in routes:
            resp = await c.request(method, url)
            assert resp.status_code == 401, (
                f"Expected 401 for unauthenticated {method} {url}, got {resp.status_code}"
            )
            print(f"[AUTH GUARD] {method} {url} -> 401 OK")

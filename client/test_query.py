"""
test_query.py — tests ALL query modes against a live Python client.

Requires:
  - uvicorn running: uvicorn main:app --reload --port 8001
  - A session with documents already ingested (set SESSION_ID below)
  - The service key matching your .env

Usage:
  python test_query.py
"""

import json
import urllib.request

SESSION_ID = "test-session-003"   # ← change to your real session ID
SERVICE_KEY = "studdybuddy_internal_2026"  # ← must match .env SERVICE_KEY
BASE_URL = "http://localhost:8001"


def ask(question: str, label: str = ""):
    payload = json.dumps({
        "question": question,
        "session_id": SESSION_ID
    }).encode()

    req = urllib.request.Request(
        f"{BASE_URL}/query",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-service-key": SERVICE_KEY
        }
    )

    print(f"\n{'='*60}")
    print(f"TEST: {label or question}")
    print(f"{'='*60}")

    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            data = json.loads(res.read().decode())
            print(f"MODE:       {data.get('mode')}")
            print(f"CONFIDENCE: {data.get('confidence')}")
            print(f"SOURCES:    {[s['filename'] for s in data.get('sources', [])]}")
            print(f"\nANSWER:\n{data.get('answer', '')[:800]}")
            if len(data.get("answer", "")) > 800:
                print("... [truncated for display]")
    except Exception as e:
        print(f"ERROR: {e}")


# ── Normal grounded question ─────────────────────────────────────────
ask(
    "What is the 8051 microcontroller?",
    label="Normal grounded question"
)

# ── Extended mode (goes beyond notes) ───────────────────────────────
ask(
    "What is the 8051 microcontroller? Give me a real world example.",
    label="Extended mode — real world example"
)

# ── Detail mode ──────────────────────────────────────────────────────
ask(
    "Explain the 8051 architecture in detail",
    label="Detail mode — explain in detail"
)

ask(
    "Elaborate on the memory organisation of the 8051",
    label="Detail mode — elaborate"
)

# ── Notes mode — with chapter/topic ─────────────────────────────────
ask(
    "Give me detailed notes for chapter 1",
    label="Notes mode — chapter-specific"
)

ask(
    "Make notes on the 8051 instruction set",
    label="Notes mode — topic-specific"
)

# ── Summarise ────────────────────────────────────────────────────────
ask(
    "Summarise my notes",
    label="Meta: Summarise"
)

# ── Key concepts ─────────────────────────────────────────────────────
ask(
    "Explain key concepts",
    label="Meta: Key concepts"
)

ask(
    "What are the main topics?",
    label="Meta: Main topics"
)

# ── Quiz — generic ───────────────────────────────────────────────────
ask(
    "Quiz me",
    label="Meta: Quiz (generic)"
)

# ── Quiz — chapter-specific ──────────────────────────────────────────
ask(
    "Give me quizzes on chapter 1",
    label="Meta: Quiz on chapter 1"
)

ask(
    "Quiz me on the 8051 timers",
    label="Meta: Quiz on specific topic"
)

# ── Study plan ───────────────────────────────────────────────────────
ask(
    "Create a study plan",
    label="Meta: Study plan"
)

print(f"\n{'='*60}")
print("All tests complete.")
print(f"{'='*60}")

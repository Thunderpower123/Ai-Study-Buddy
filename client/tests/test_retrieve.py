# test_retrieve.py
# Tests the retrieval pipeline: query rewriting, expansion, MMR, and full retrieve_chunks().
#
# HOW TO RUN:
#   python -m pytest tests/test_retrieve.py -v
#
# What gets tested:
#   1. Query rewriter  — does it produce a better standalone question?
#   2. Query expander  — does it return 3 clean query strings?
#   3. MMR algorithm   — does it select diverse chunks correctly?
#   4. Prompt builder  — grounded vs extended mode detection + profile injection
#   5. Full retrieve_chunks() — end-to-end retrieval with real Pinecone data

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import numpy as np


# ── 0. Groq client (LIVE — hits llama-3.1-8b-instant directly) ───────────────
@pytest.mark.asyncio
async def test_groq_client_returns_text():
    from llm.groq_client import groq_chat
    messages = [
        {"role": "system", "content": "Answer in one sentence only."},
        {"role": "user", "content": "What is Ohm's law?"}
    ]
    reply = await groq_chat(messages)
    assert isinstance(reply, str), "Should return a string"
    assert len(reply) > 10, "Groq reply should not be empty"
    assert any(word in reply.lower() for word in ["voltage", "current", "resistance", "ohm", "v", "ir"]), (
        f"Expected Ohm's law content in reply, got: {reply}"
    )
    print(f"\n[Groq llama-3.1-8b] Reply: {reply}")


# ── 1. Query Rewriter (LIVE — hits Groq) ────────────────────────────────────
@pytest.mark.asyncio
async def test_rewriter_standalone_question():
    from chatbot.query_rewriter import rewrite_query
    history = [
        {"role": "user", "content": "What is Newton second law?"},
        {"role": "assistant", "content": "Newton second law states F=ma, where F is force, m is mass and a is acceleration."}
    ]
    result = await rewrite_query("And how is it different from the first law?", history)
    assert isinstance(result, str), "Should return a string"
    assert len(result) > 10, "Rewritten question should not be empty"
    lowered = result.lower()
    assert any(word in lowered for word in ["newton", "law", "first", "second", "motion"]), (
        f"Rewritten question should contain context words. Got: {result}"
    )
    print(f"\n[REWRITER] Input: 'And how is it different from the first law?'")
    print(f"[REWRITER] Output: '{result}'")


@pytest.mark.asyncio
async def test_rewriter_no_history_returns_original():
    from chatbot.query_rewriter import rewrite_query
    question = "What is photosynthesis?"
    result = await rewrite_query(question, [])
    assert result == question, "With no history, should return the original question unchanged"
    print(f"\n[REWRITER] No history returned original: '{result}'")


@pytest.mark.asyncio
async def test_rewriter_returns_string_not_empty():
    from chatbot.query_rewriter import rewrite_query
    history = [
        {"role": "user", "content": "Explain Ohm law"},
        {"role": "assistant", "content": "Ohm law states V = IR."}
    ]
    result = await rewrite_query("What about power?", history)
    assert isinstance(result, str) and len(result) > 5
    print(f"\n[REWRITER] Follow-up rewritten: '{result}'")


# ── 2. Query Expander (LIVE — hits Groq) ────────────────────────────────────
@pytest.mark.asyncio
async def test_expander_returns_3_queries():
    from chatbot.query_expander import expand_query
    queries = await expand_query("What is Fleming right hand rule?")
    assert isinstance(queries, list), "Should return a list"
    assert len(queries) <= 3, f"Should return at most 3 queries, got {len(queries)}"
    assert len(queries) >= 1, "Should return at least 1 query (original)"
    assert queries[0] == "What is Fleming right hand rule?", "First query should be the original"
    print(f"\n[EXPANDER] Queries generated:")
    for i, q in enumerate(queries):
        print(f"  [{i}] {q}")


@pytest.mark.asyncio
async def test_expander_no_garbage_lines():
    from chatbot.query_expander import expand_query
    queries = await expand_query("Explain Newton second law")
    for q in queries:
        assert len(q) > 15, f"Query too short (likely a header/intro line): '{q}'"
        assert not q[0].isdigit(), f"Query starts with digit (numbered prefix not stripped): '{q}'"
    print(f"\n[EXPANDER] All {len(queries)} queries passed garbage filter")


# ── 3. MMR Algorithm (pure logic — no network calls) ────────────────────────
def make_vec(values):
    v = np.array(values, dtype=float)
    return (v / np.linalg.norm(v)).tolist()


def test_mmr_selects_diverse_chunks():
    from rag.mmr import mmr_select
    vec_A = make_vec([1.0, 0.1, 0.0])
    vec_B = make_vec([1.0, 0.05, 0.0])  # almost same as A
    vec_C = make_vec([0.0, 0.0, 1.0])   # completely different
    query = make_vec([1.0, 0.0, 0.0])
    candidates = [
        {"text": "Chunk A - Newton law", "vector": vec_A, "score": 0.95, "filename": "f.pdf", "chunk_index": 0},
        {"text": "Chunk B - Newton again", "vector": vec_B, "score": 0.93, "filename": "f.pdf", "chunk_index": 1},
        {"text": "Chunk C - Completely different", "vector": vec_C, "score": 0.70, "filename": "f.pdf", "chunk_index": 2},
    ]
    selected = mmr_select(query, candidates, top_k=2)
    texts = [s["text"] for s in selected]
    assert "Chunk A - Newton law" in texts, "MMR should pick most relevant chunk first"
    assert "Chunk C - Completely different" in texts, "MMR should pick diverse chunk over redundant one"
    assert "Chunk B - Newton again" not in texts, "MMR should NOT pick near-duplicate of A"
    print(f"\n[MMR] Selected: {texts}")


def test_mmr_top_k_respected():
    from rag.mmr import mmr_select
    candidates = [
        {"text": f"Chunk {i}", "vector": make_vec([float(i), 0.0, 0.0]), "score": 0.8, "filename": "f.pdf", "chunk_index": i}
        for i in range(1, 6)
    ]
    query = make_vec([1.0, 0.0, 0.0])
    selected = mmr_select(query, candidates, top_k=3)
    assert len(selected) == 3, f"Should select exactly 3, got {len(selected)}"
    print(f"\n[MMR] top_k=3 correctly returned {len(selected)} chunks")


# ── 4. Prompt Builder ────────────────────────────────────────────────────────
def test_prompt_builder_grounded_mode():
    from chatbot.prompt_builder import detect_meta_command, detect_extended_mode
    # Normal factual questions should NOT trigger meta or extended
    assert detect_meta_command("What is Newton second law?") is None
    assert detect_extended_mode("What is Newton second law?") is False
    assert detect_meta_command("Define photosynthesis") is None
    assert detect_extended_mode("Define photosynthesis") is False


def test_prompt_builder_extended_mode():
    from chatbot.prompt_builder import detect_extended_mode
    assert detect_extended_mode("Can you explain more about this?") is True
    assert detect_extended_mode("Give me an example of this") is True
    assert detect_extended_mode("Simplify this for me") is True
    assert detect_extended_mode("I dont understand this") is True
    assert detect_extended_mode("Break it down please") is True
    print("\n[PROMPT] All extended-mode keywords correctly detected")


def test_prompt_builder_returns_correct_structure():
    from chatbot.prompt_builder import build_prompt
    messages, mode = build_prompt(
        question="What is F=ma?",
        context="Newton second law: F=ma where F is force, m is mass, a is acceleration.",
        chat_history=[],
        user_profile=None
    )
    assert isinstance(messages, list)
    assert messages[0]["role"] == "system"
    assert messages[-1]["role"] == "user"
    assert messages[-1]["content"] == "What is F=ma?"
    assert mode == "grounded"
    print(f"\n[PROMPT] Message structure correct. Mode={mode}. Messages={len(messages)}")


def test_prompt_builder_with_profile():
    from chatbot.prompt_builder import build_prompt
    from schemas.query import UserProfile
    profile = UserProfile(branch="Electrical Engineering", year=2, university="IIT Delhi")
    messages, mode = build_prompt(
        question="What is Ohm law?",
        context="Ohm law: V = IR",
        chat_history=[],
        user_profile=profile
    )
    system_content = messages[0]["content"]
    assert "Electrical Engineering" in system_content
    assert "IIT Delhi" in system_content
    assert "2nd year" in system_content
    print(f"\n[PROMPT] Profile injected correctly into system prompt")


def test_prompt_builder_no_triple_blank_lines():
    from chatbot.prompt_builder import build_prompt
    messages, _ = build_prompt("What is X?", "Some context", [], user_profile=None)
    system = messages[0]["content"]
    assert "\n\n\n" not in system, "Should not have triple blank lines when profile is empty"
    print(f"\n[PROMPT] No triple blank lines when profile is None")


def test_prompt_builder_history_windowed():
    from chatbot.prompt_builder import build_prompt
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"msg {i}"}
        for i in range(10)
    ]
    messages, _ = build_prompt("New question", "context", history)
    # 1 system + 6 history + 1 user = 8
    assert len(messages) == 8, f"Expected 8 messages, got {len(messages)}"
    print(f"\n[PROMPT] History windowing correct: {len(messages)} messages total")


# ── 5. Full retrieve_chunks() (LIVE — needs Pinecone data from test_ingest) ──
@pytest.mark.asyncio
async def test_retrieve_chunks_returns_context():
    """
    Run test_ingest.py FIRST so Pinecone has data in test-session-ingest-001.
    """
    from rag.retrieve import retrieve_chunks
    context, sources, confidence = await retrieve_chunks(
        question="What is Newton second law?",
        session_id="test-session-ingest-001",
        chat_history=[]
    )
    assert isinstance(context, str)
    assert isinstance(sources, list)
    assert confidence in ["high", "medium", "low"]
    if context:
        print(f"\n[RETRIEVE] Context length={len(context)}")
        print(f"[RETRIEVE] Sources: {sources}")
        print(f"[RETRIEVE] Confidence: {confidence}")
    else:
        print(f"\n[RETRIEVE] WARNING: No context. Run test_ingest.py first.")


# ── 5. Full retrieve_chunks() (LIVE — needs data in Pinecone from test_ingest) ─
@pytest.mark.asyncio
async def test_retrieve_chunks_returns_context():
    """
    IMPORTANT: Run test_ingest.py FIRST so data exists in Pinecone.
    This test queries the same session seeded by test_pinecone_upsert_and_search.
    """
    from rag.retrieve import retrieve_chunks

    context, sources, confidence = await retrieve_chunks(
        question="What is Newton second law?",
        session_id="test-session-ingest-001",
        chat_history=[]
    )

    assert isinstance(context, str), "Context should be a string"
    assert isinstance(sources, list), "Sources should be a list"
    assert isinstance(confidence, str), "Confidence should be a string"
    assert confidence in ["high", "medium", "low"], f"Invalid confidence value: {confidence}"

    if context:
        assert len(context) > 10, "Context should have real content"
        print(f"\n[RETRIEVE] Context length={len(context)}")
        print(f"[RETRIEVE] Sources: {sources}")
        print(f"[RETRIEVE] Confidence: {confidence}")
    else:
        print(f"\n[RETRIEVE] WARNING: No context returned. Run test_ingest.py first to seed Pinecone.")

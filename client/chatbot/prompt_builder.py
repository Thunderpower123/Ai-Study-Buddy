import re
from typing import Optional, List

# ─────────────────────────────────────────────────────────────────────────────
# META-COMMAND KEYWORD LISTS
# These are instructions TO the AI, not questions ABOUT content.
# Order matters — more specific patterns first.
# ─────────────────────────────────────────────────────────────────────────────

META_NOTES = [
    # Catches: "give me detailed notes", "make notes on chapter 1", "notes for chapter 2"
    # Must come before META_SUMMARISE to avoid "notes" being swallowed by summary logic
    "give me notes",
    "make notes",
    "create notes",
    "generate notes",
    "write notes",
    "detailed notes",
    "notes for",
    "notes on",
    "notes from",
    "make me notes",
    "give notes",
]

META_SUMMARISE = [
    "summarise my notes",
    "summarize my notes",
    "summarise these notes",
    "summarize these notes",
    "summarise the notes",
    "summarize the notes",
    "summarise everything",
    "summarize everything",
    "give me a summary",
    "give a summary",
    "summary of my notes",
    "summary of notes",
    "what are my notes about",
    "what is in my notes",
    "overview of my notes",
    "overview of the notes",
]

META_KEY_CONCEPTS = [
    "explain key concepts",
    "key concepts",
    "what are the key concepts",
    "list key concepts",
    "important concepts",
    "main concepts",
    "core concepts",
    "what are the main topics",
    "main topics",
    "important topics",
    "list topics",
    "what topics are covered",
    "topics covered",
]

META_QUIZ = [
    "quiz me",
    "quiz me on",
    "quiz on",
    "give me a quiz",
    "give quizzes",
    "give me quizzes",
    "test me",
    "test me on",
    "create a quiz",
    "generate a quiz",
    "make a quiz",
    "ask me questions",
    "give me questions",
    "practice questions",
    "generate questions",
    "questions on",
    "questions for",
]

META_STUDY_PLAN = [
    "create a study plan",
    "make a study plan",
    "study plan",
    "help me study",
    "how should i study",
    "how do i study this",
    "plan my study",
    "what should i study first",
    "study schedule",
    "learning plan",
]

# ─────────────────────────────────────────────────────────────────────────────
# DETAIL-LEVEL DETECTION
# "explain in detail", "elaborate", "deep dive" → more chunks, richer prompt
# ─────────────────────────────────────────────────────────────────────────────

DETAIL_KEYWORDS = [
    "in detail",
    "in depth",
    "in-depth",
    "detailed explanation",
    "explain in detail",
    "explain in depth",
    "explain thoroughly",
    "thoroughly",
    "comprehensive",
    "comprehensive explanation",
    "elaborate",
    "elaborate on",
    "tell me everything",
    "full explanation",
    "complete explanation",
    "deep dive",
    "deep explanation",
    "explain completely",
    "explain fully",
]

# ─────────────────────────────────────────────────────────────────────────────
# EXTENDED MODE DETECTION
# Notes + general knowledge
# ─────────────────────────────────────────────────────────────────────────────

EXTENDED_KEYWORDS = [
    "explain further",
    "explain more",
    "tell me more",
    "simplify",
    "in simple terms",
    "real world example",
    "give me an example",
    "example of this",
    "why does",
    "how does",
    "can you explain",
    "i don't understand",
    "i dont understand",
    "what do you mean",
    "more detail",
    "break it down",
    "make it simpler",
    "easier to understand",
]

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

GROUNDED_SYSTEM_PROMPT = """
You are a study assistant. Your job is to answer the student's questions
strictly based on the notes provided below.

Rules:
- Base your answer only on the notes.
- If the answer is not found in the notes, say:
  "I could not find that in your notes."
- You may add minimal explanation ONLY to clarify concepts from the notes.
- Do NOT introduce new concepts not in the notes.
- Be concise, accurate, and structured.

Structure your answer as:

From your notes:
...

Explanation:
...

(Optional) Additional clarification:
...

{profile_section}

NOTES:
{context}
""".strip()

EXTENDED_SYSTEM_PROMPT = """
You are a study assistant helping a student understand a topic more deeply.

Rules:
- Start with the notes as the foundation.
- Then extend with your general knowledge.
- Clearly label what comes from notes vs general knowledge.
- Use phrases like "Your notes mention..." and "Beyond your notes..." / "In general..."
- Use examples, intuition, and simple language.

Structure your answer as:

From your notes:
...

Extended explanation:
...

Example / intuition (if helpful):
...

{profile_section}

NOTES:
{context}
""".strip()

DETAIL_SYSTEM_PROMPT = """
You are a thorough study assistant. The student wants a deep, detailed explanation.
Use ALL content from the notes provided and go beyond them where helpful.

Rules:
- Cover EVERYTHING relevant in the notes — do not skip sections.
- Use clear headings and sub-points.
- Define every key term.
- Add examples, analogies, and intuition.
- After covering the notes, extend with general knowledge.
- This is a full study session, not a quick answer.

Structure your answer as:

## Overview
(Brief intro of what will be covered)

## [Topic / Section]
(Detailed explanation + examples + definitions)

## [Next topic...]
...

## Key Takeaways
- ...

{profile_section}

NOTES:
{context}
""".strip()

NOTES_SYSTEM_PROMPT = """
You are a study assistant creating detailed, well-structured study notes.
The student has asked for notes — possibly on a specific chapter or topic.
Use the content provided from their uploaded documents to produce these notes.

Rules:
- Organise notes clearly with headings, subheadings, and bullet points.
- Cover ALL key concepts, definitions, formulas, and important points in the content.
- Use short, clear sentences — these are study notes, not an essay.
- Bold important terms and highlight formulas or key values.
- Add brief examples under complex concepts to aid memory.
- Do NOT add information not present in the provided content.
- If a specific chapter or topic is mentioned, focus on it. If not, cover everything.

Structure your notes as:

# Notes: [Chapter / Topic Name]

## [Section 1]
- Key point
- **Important term**: definition
- Formula (if any)

## [Section 2]
...

## Summary
- Most important takeaways in bullet form

{profile_section}

NOTES:
{context}
""".strip()

SUMMARISE_SYSTEM_PROMPT = """
You are a study assistant. The student wants a structured summary of their uploaded notes.
Synthesise the provided content into a clean, organised summary.

Rules:
- Cover ALL major topics — do not skip sections.
- Group related points under clear headings.
- Use bullet points for facts, numbered lists for processes/steps.
- Bold the most important terms.
- End with a "Key Takeaways" section.
- Summarise only what is in the notes — no external knowledge.

Structure your response as:

## Summary of Your Notes

### [Main Topic 1]
- ...

### [Main Topic 2]
- ...

## Key Takeaways
- ...

{profile_section}

NOTES:
{context}
""".strip()

KEY_CONCEPTS_SYSTEM_PROMPT = """
You are a study assistant extracting and explaining key concepts from the student's notes.

Rules:
- List every significant concept, theory, formula, or term from the notes.
- For each: give a clear definition, explain its importance, add an example if helpful.
- Group related concepts together.
- Only use what's in the notes.

Structure your response as:

## Key Concepts from Your Notes

### [Concept Name]
**Definition:** ...
**Why it matters:** ...
**Example (if applicable):** ...

### [Next Concept]
...

{profile_section}

NOTES:
{context}
""".strip()

QUIZ_SYSTEM_PROMPT = """
You are a study assistant generating a quiz from the student's uploaded notes.
Create a well-structured quiz that tests understanding of the material.
If a specific chapter or topic is mentioned, focus the quiz on that.

Rules:
- Generate 8-10 questions of varying difficulty: easy, medium, hard.
- Mix types: MCQ (4 options, mark correct one), short answer, and true/false.
- Every question must be answerable from the provided notes.
- After ALL questions, provide the full Answer Key with brief explanations.
- Do NOT make questions about things not in the notes.

Structure your response as:

## Quiz: [Topic / Chapter from notes]

### Multiple Choice
**Q1.** [Question]
a) ...  b) ...  c) ...  d) ...

**Q2.** ...

### Short Answer
**Q6.** [Question]

### True or False
**Q9.** [Statement] — True / False

---

## Answer Key
**Q1.** [Correct answer] — [Brief explanation]
**Q2.** ...

{profile_section}

NOTES:
{context}
""".strip()

STUDY_PLAN_SYSTEM_PROMPT = """
You are a study assistant creating a practical study plan from the student's notes.

Rules:
- Identify all major topics and subtopics from the notes.
- Estimate relative complexity/time per topic.
- Sequence topics logically (prerequisites first).
- Suggest specific study activities per topic (re-read, practice, flashcards, etc).
- Keep the plan realistic for a student.

Structure your response as:

## Study Plan for Your Notes

### Topics Identified
(List all topics from the notes)

### Recommended Study Order & Schedule

**Day 1 — [Topic]**
- Goal: ...
- Activities: ...
- Time estimate: ...

**Day 2 — [Topic]**
...

### Study Tips for This Material
- ...

{profile_section}

NOTES:
{context}
""".strip()


# ─────────────────────────────────────────────────────────────────────────────
# DETECTION FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def detect_meta_command(question: str) -> Optional[str]:
    """
    Returns the meta-command type if the question is a meta-command, else None.

    Returns: "notes" | "summarise" | "key_concepts" | "quiz" | "study_plan" | None

    Priority: notes > quiz > summarise > key_concepts > study_plan
    "notes" is checked first so "give me detailed notes" doesn't fall into summarise.
    "quiz" is checked before key_concepts so "quiz me on key concepts" → quiz, not key_concepts.
    """
    q = question.lower().strip()

    for kw in META_NOTES:
        if kw in q:
            return "notes"
    for kw in META_QUIZ:
        if kw in q:
            return "quiz"
    for kw in META_SUMMARISE:
        if kw in q:
            return "summarise"
    for kw in META_KEY_CONCEPTS:
        if kw in q:
            return "key_concepts"
    for kw in META_STUDY_PLAN:
        if kw in q:
            return "study_plan"
    return None


def detect_detail_mode(question: str) -> bool:
    """Returns True if the user wants an in-depth explanation."""
    q = question.lower()
    return any(kw in q for kw in DETAIL_KEYWORDS)


def detect_extended_mode(question: str) -> bool:
    """Returns True if the user wants to go beyond the notes."""
    q = question.lower()
    return any(kw in q for kw in EXTENDED_KEYWORDS)


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def _build_profile_section(user_profile) -> str:
    if not user_profile:
        return ""

    lines = []
    if user_profile.education:
        lines.append(f"- Education level: {user_profile.education}")
    if user_profile.stream:
        lines.append(f"- Stream: {user_profile.stream}")

    branch = user_profile.branch or user_profile.courseBranch
    if branch:
        lines.append(f"- Branch / specialisation: {branch}")
    if user_profile.year:
        year_suffix = {1: "st", 2: "nd", 3: "rd"}.get(user_profile.year, "th")
        lines.append(f"- Year: {user_profile.year}{year_suffix} year")
    if user_profile.university:
        lines.append(f"- University: {user_profile.university}")
    if user_profile.interests:
        lines.append(f"- Interests: {', '.join(user_profile.interests)}")
    if user_profile.domains:
        lines.append(f"- Domains: {', '.join(user_profile.domains)}")
    if user_profile.bio:
        lines.append(f"- Bio: {user_profile.bio}")

    if not lines:
        return ""
    return "STUDENT PROFILE:\n" + "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# MODE → NODE-SAFE MODE MAPPING
# message.models.js in Node only accepts enum ["grounded", "extended"].
# We use richer internal modes for routing but must map them back before returning.
# ─────────────────────────────────────────────────────────────────────────────

# Internal mode → what gets saved in MongoDB Message document
# "grounded" = answer from notes only
# "extended" = goes beyond notes
NODE_MODE_MAP = {
    "grounded":    "grounded",
    "extended":    "extended",
    "detail":      "extended",   # detail = extended explanation
    "notes":       "grounded",   # notes are strictly from uploaded content
    "summarise":   "grounded",   # summary is from notes only
    "key_concepts":"grounded",   # concept extraction from notes
    "quiz":        "grounded",   # quiz is from notes only
    "study_plan":  "grounded",   # study plan from notes
}


def get_node_mode(internal_mode: str) -> str:
    """Returns the Node-safe mode string for saving in MongoDB."""
    return NODE_MODE_MAP.get(internal_mode, "grounded")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN BUILD FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def build_prompt(
    question: str,
    context: str,
    chat_history: List[dict],
    user_profile=None,
    mode_hint: Optional[str] = None,
) -> tuple:
    """
    Returns (messages, internal_mode).

    internal_mode is used by:
      - openai_client.py  → to scale max_tokens
      - chat_service.py   → to call get_node_mode() before returning to Node

    Priority: notes > quiz > summarise > key_concepts > study_plan > detail > extended > grounded

    mode_hint: optional string from the Node frontend toggle ("grounded" | "general").
      When the user explicitly flips the toggle to "general", we treat it as
      "extended" mode — overriding keyword detection — unless a meta-command or
      detail-level keyword takes higher priority.
    """
    profile_section = _build_profile_section(user_profile)
    meta = detect_meta_command(question)
    is_detail = detect_detail_mode(question)
    # Honour the frontend toggle: "general" hint forces extended mode
    is_extended = detect_extended_mode(question) or (mode_hint == "general")

    if meta == "notes":
        mode = "notes"
        system_prompt = NOTES_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif meta == "quiz":
        mode = "quiz"
        system_prompt = QUIZ_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif meta == "summarise":
        mode = "summarise"
        system_prompt = SUMMARISE_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif meta == "key_concepts":
        mode = "key_concepts"
        system_prompt = KEY_CONCEPTS_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif meta == "study_plan":
        mode = "study_plan"
        system_prompt = STUDY_PLAN_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif is_detail:
        mode = "detail"
        system_prompt = DETAIL_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    elif is_extended:
        mode = "extended"
        system_prompt = EXTENDED_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )
    else:
        mode = "grounded"
        system_prompt = GROUNDED_SYSTEM_PROMPT.format(
            context=context, profile_section=profile_section
        )

    system_prompt = re.sub(r'\n{3,}', '\n\n', system_prompt).strip()

    messages = [{"role": "system", "content": system_prompt}]

    # Skip chat history for meta-commands — it's noise when generating a full quiz/summary
    if meta is None:
        recent_history = chat_history[-6:] if len(chat_history) > 6 else chat_history
        messages.extend(recent_history)

    messages.append({"role": "user", "content": question})

    return messages, mode

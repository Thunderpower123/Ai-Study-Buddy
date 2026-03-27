from typing import Optional, List

EXTENDED_KEYWORDS = [
    "explain further",
    "explain more",
    "tell me more",
    "elaborate",
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
    "deeper explanation",
    "more detail",
    "in detail",
    "break it down",
    "make it simpler",
    "easier to understand",
]

GROUNDED_SYSTEM_PROMPT = """
You are a study assistant. Your job is to answer the student's questions
primarily based on the notes provided below.

Rules:
- Base your answer primarily on the notes.
- If the answer is not found in the notes, say clearly:
  "I could not find that in your notes."
- You may add minimal explanation ONLY to clarify concepts.
- Do NOT introduce new concepts not present in notes.
- Be concise, accurate, and structured.

Structure your answer strictly as:

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
- Start your answer using the provided notes as the foundation.
- Then extend the explanation using your general knowledge.
- Clearly distinguish what comes from the notes vs general knowledge.
- Use phrases like:
  - "Your notes mention..." (for note-based content)
  - "Beyond your notes..." or "In general..." (for extended content)
- Use simple explanations, real-world examples, and intuition.
- Keep answers structured and easy to follow.

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


def _build_profile_section(user_profile) -> str:
    if not user_profile:
        return ""

    lines = []

    if user_profile.branch:
        lines.append(f"- Branch: {user_profile.branch}")

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


def detect_mode(question: str) -> str:
    q = question.lower()
    for keyword in EXTENDED_KEYWORDS:
        if keyword in q:
            return "extended"
    return "grounded"


def build_prompt(
    question: str,
    context: str,
    chat_history: List[dict],
    user_profile=None
) -> tuple:

    mode = detect_mode(question)
    profile_section = _build_profile_section(user_profile)

    if mode == "extended":
        system_prompt = EXTENDED_SYSTEM_PROMPT.format(
            context=context,
            profile_section=profile_section
        )
    else:
        system_prompt = GROUNDED_SYSTEM_PROMPT.format(
            context=context,
            profile_section=profile_section
        )

    # Clean up double blank lines when profile_section is empty
    import re
    system_prompt = re.sub(r'\n{3,}', '\n\n', system_prompt).strip()

    # System message
    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # 🔥 Reduced history (better signal-to-noise)
    recent_history = chat_history[-6:] if len(chat_history) > 6 else chat_history
    messages.extend(recent_history)

    # Current user question
    messages.append({"role": "user", "content": question})

    return messages, mode
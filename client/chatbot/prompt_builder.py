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
strictly based on the notes provided below.

Rules:
- Only use information from the provided notes to answer.
- If the answer is not found in the notes, say clearly:
  "I could not find that in your notes."
- Do not use outside knowledge.
- Be concise and accurate.

{profile_section}

NOTES:
{context}
""".strip()

EXTENDED_SYSTEM_PROMPT = """
You are a study assistant helping a student understand a topic more deeply.
The student has asked for a further explanation beyond what their notes say.

Rules:
- Start your answer using the provided notes as the foundation.
- Then extend the explanation using your general knowledge.
- Clearly distinguish what comes from their notes vs your general knowledge.
  Use phrases like "Your notes mention..." for note-based content,
  and "Beyond your notes..." or "In general..." for extended knowledge.
- Use simple language, real world examples, and analogies where helpful.
- Be thorough but not overwhelming.

{profile_section}

NOTES:
{context}
""".strip()


def _build_profile_section(user_profile) -> str:
    """
    Builds the student profile block injected into the system prompt.

    If no profile is provided (or all fields are empty), returns an empty string
    so the prompt is unchanged — grounded/extended logic still works fine.

    This is the feature that differentiates AI Study Buddy from NotebookLM:
    every answer is tailored to the student's branch, year, and interests.

    Example output:
        STUDENT PROFILE:
        - Branch: Electrical Engineering
        - Year: 2nd year
        - University: IIT Bombay
        - Interests: circuits, machines
        - Domains: Backend, Computer Vision
        - Bio: Interested in power systems and IoT.

    The LLM uses this to adjust explanation depth and pick relevant examples.
    A 2nd-year EE student gets a circuit-level explanation of Fleming's rule.
    A 4th-year CS student gets a more abstract, algorithm-oriented treatment.
    """
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
    """
    Detects whether the user wants a grounded answer (from notes only)
    or an extended explanation (notes + general knowledge).

    Returns:
        "grounded" or "extended"
    """
    q = question.lower()
    for keyword in EXTENDED_KEYWORDS:
        if keyword in q:
            return "extended"
    return "grounded"


def build_prompt(question: str, context: str, chat_history: list, user_profile=None) -> tuple:
    """
    Builds the full prompt to send to OpenAI.

    Args:
        question:     the user's latest message
        context:      the retrieved chunks from Pinecone (joined as a string)
        chat_history: list of past messages [{"role": "user"/"assistant", "content": "..."}]
        user_profile: UserProfile object (optional) — injected into system prompt
                      for personalised responses based on branch, year, interests

    Returns:
        A tuple of (messages_array, mode_used)
        messages_array is what gets sent directly to OpenAI chat completions
    """

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

    # Start with system message
    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Add last 10 messages of chat history for context
    recent_history = chat_history[-10:] if len(chat_history) > 10 else chat_history
    messages.extend(recent_history)

    # Add the current user question
    messages.append({"role": "user", "content": question})

    return messages, mode

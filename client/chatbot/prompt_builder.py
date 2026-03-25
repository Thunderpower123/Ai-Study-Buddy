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

NOTES:
{context}
""".strip()


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


def build_prompt(question: str, context: str, chat_history: list) -> tuple:
    """
    Builds the full prompt to send to OpenAI.

    Args:
        question:     the user's latest message
        context:      the retrieved chunks from Pinecone (joined as a string)
        chat_history: list of past messages [{"role": "user"/"assistant", "content": "..."}]

    Returns:
        A tuple of (messages_array, mode_used)
        messages_array is what gets sent directly to OpenAI chat completions
    """

    mode = detect_mode(question)

    if mode == "extended":
        system_prompt = EXTENDED_SYSTEM_PROMPT.format(context=context)
    else:
        system_prompt = GROUNDED_SYSTEM_PROMPT.format(context=context)

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

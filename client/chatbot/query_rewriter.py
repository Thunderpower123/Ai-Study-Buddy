from llm.groq_client import groq_chat


async def rewrite_query(question: str, chat_history: list) -> str:
    """
    Rewrites follow-up queries into standalone queries.
    """

    if not chat_history:
        return question

    # Grab last user message AND last assistant reply for full context
    last_user = ""
    last_assistant = ""
    for msg in reversed(chat_history):
        if msg["role"] == "assistant" and not last_assistant:
            last_assistant = msg["content"]
        elif msg["role"] == "user" and not last_user:
            last_user = msg["content"]
        if last_user and last_assistant:
            break

    context_block = f"Previous question: {last_user}\n"
    if last_assistant:
        # Truncate long assistant answers to first 300 chars to avoid token bloat
        summary = last_assistant[:300]
        suffix = "..." if len(last_assistant) > 300 else ""
        context_block += f"Assistant's answer (summary): {summary}{suffix}\n"

    prompt = [
        {
            "role": "system",
            "content": "Rewrite the user's question into a clear standalone query using context. Keep it concise. Return only the rewritten question, nothing else."
        },
        {
            "role": "user",
            "content": f"{context_block}Current question: {question}\n\nRewritten standalone question:"
        }
    ]

    rewritten = await groq_chat(prompt)

    return rewritten if rewritten else question
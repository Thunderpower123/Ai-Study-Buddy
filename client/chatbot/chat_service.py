from client.chatbot.prompt_builder import build_prompt
from client.llm.openai_client import get_openai_client, get_openai_model


async def get_answer(question: str, context: str, chat_history: list) -> dict:
    """
    Orchestrates the full chat flow:
    1. Detect mode (grounded or extended)
    2. Build prompt
    3. Call OpenAI
    4. Return answer + mode used

    Args:
        question:     the user's message
        context:      retrieved chunks from Pinecone joined as a string
        chat_history: list of past messages [{"role": "...", "content": "..."}]

    Returns:
        {
            "answer": "...",
            "mode": "grounded" or "extended"
        }
    """

    # Step 1 + 2 — detect mode and build prompt
    messages, mode = build_prompt(question, context, chat_history)

    # Step 3 — call OpenAI
    client = get_openai_client()
    model = get_openai_model()

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.4,
        max_tokens=1000,
    )

    answer = response.choices[0].message.content.strip()

    return {
        "answer": answer,
        "mode": mode
    }

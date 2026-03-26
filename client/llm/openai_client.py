from openai import AsyncOpenAI
from typing import List, Dict

from config.settings import settings
from utils.logging import get_logger
from utils.retry import async_retry

logger = get_logger(__name__)

# Single shared async client (module-level)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def _clean_text(text: str) -> str:
    """
    Basic text cleaning before sending to embedding model.

    - Strips leading/trailing whitespace
    - Collapses excessive internal whitespace
    - Guards against None / empty input
    """
    if not text:
        return ""
    return " ".join(text.strip().split())


@async_retry(retries=3, delay=1.0)
async def get_embedding(text: str) -> List[float]:
    """
    Generates an embedding vector for the given text.

    Model: text-embedding-3-small (~1536 dimensions)

    Returns:
        List[float]: embedding vector
    """
    try:
        cleaned = _clean_text(text)

        if not cleaned:
            logger.warning("Empty text received for embedding.")
            return []

        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=cleaned
        )

        embedding = response.data[0].embedding

        logger.info("Embedding generated successfully.")
        return embedding

    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise  # required so retry decorator can catch


@async_retry(retries=3, delay=1.0)
async def get_chat_response(messages: List[Dict]) -> str:
    """
    Generates a chat completion from OpenAI.

    Model: gpt-4o-mini

    Args:
        messages: List of dicts with role/content

    Returns:
        str: assistant's reply
    """
    try:
        if not messages:
            logger.warning("Empty messages list passed to chat.")
            return ""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1000,
            temperature=0.3
        )

        reply = response.choices[0].message.content.strip()

        logger.info("Chat response generated successfully.")
        return reply

    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        raise  # required for retry
from openai import AsyncOpenAI
from typing import List, Dict

from config.settings import settings
from utils.logging import get_logger
from utils.retry import async_retry

logger = get_logger(__name__)

# Single shared async client (module-level)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Modes that generate long structured output — quiz, summary, detailed notes, study plan, etc.
# These need a much higher token ceiling or GPT cuts off mid-response.
LONG_OUTPUT_MODES = {"quiz", "summarise", "key_concepts", "study_plan", "detail"}


def _clean_text(text: str) -> str:
    """
    Basic text cleaning before sending to embedding model.
    """
    if not text:
        return ""
    return " ".join(text.strip().split())


@async_retry(retries=3, delay=1.0)
async def get_embedding(text: str) -> List[float]:
    """
    Generates an embedding vector for the given text.
    Model: text-embedding-3-small (~1536 dimensions)
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
        raise


@async_retry(retries=3, delay=1.0)
async def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a list of texts in a single API call.
    OpenAI supports up to 2048 inputs per request.
    """
    try:
        if not texts:
            logger.warning("Empty texts list passed to batch embedding.")
            return []

        cleaned = [_clean_text(t) for t in texts]
        indexed = [(i, t) for i, t in enumerate(cleaned) if t]

        if not indexed:
            logger.warning("All texts were empty after cleaning.")
            return [[] for _ in texts]

        indices, valid_texts = zip(*indexed)

        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=list(valid_texts)
        )

        result: List[List[float]] = [[] for _ in texts]
        for rank, original_idx in enumerate(indices):
            result[original_idx] = response.data[rank].embedding

        logger.info(f"Batch embedding complete: {len(valid_texts)}/{len(texts)} texts embedded.")
        return result

    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise


@async_retry(retries=3, delay=1.0)
async def get_chat_response(messages: List[Dict], mode: str = "grounded") -> str:
    """
    Generates a chat completion from OpenAI.
    Model: gpt-4o-mini

    max_tokens scales with mode:
    - Long output modes (quiz, summarise, notes, study plan): 4000 tokens
    - Normal grounded/extended: 1500 tokens

    This prevents GPT from cutting off a quiz mid-question or
    truncating a detailed explanation.
    """
    try:
        if not messages:
            logger.warning("Empty messages list passed to chat.")
            return ""

        # Scale token limit based on what GPT needs to produce
        max_tokens = 4000 if mode in LONG_OUTPUT_MODES else 1500

        logger.info(f"Chat request | mode={mode} | max_tokens={max_tokens}")

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3
        )

        reply = response.choices[0].message.content.strip()
        logger.info("Chat response generated successfully.")
        return reply

    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        raise

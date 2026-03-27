import asyncio
import json
from typing import List, Dict

from upstash_redis import Redis

from config.settings import settings
from utils.logging import get_logger

logger = get_logger(__name__)

# Single shared Redis client (Upstash REST-based)
redis = Redis(
    url=settings.UPSTASH_REDIS_REST_URL,
    token=settings.UPSTASH_REDIS_REST_TOKEN
)


def _build_key(session_id: str) -> str:
    """
    Constructs the Redis key for a session's chat history.
    """
    return f"session:{session_id}:messages"


async def get_chat_history(session_id: str) -> List[Dict]:
    """
    Fetches chat history from Redis for a given session.

    - Returns a list of message dicts:
      [{"role": "user", "content": "..."}, ...]
    - If key does not exist or value is invalid → returns []

    Uses asyncio.to_thread to avoid blocking the event loop.
    """
    try:
        key = _build_key(session_id)

        # Upstash SDK is sync → run in thread
        raw = await asyncio.to_thread(redis.get, key)

        if not raw:
            return []

        # Upstash may return str already; ensure proper parsing
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")

        messages = json.loads(raw)

        # Basic validation
        if not isinstance(messages, list):
            logger.warning(f"Invalid chat history format for key={key}")
            return []

        return messages

    except Exception as e:
        logger.error(f"Error fetching chat history for session={session_id}: {e}")
        return []


async def save_chat_history(session_id: str, messages: List[Dict]) -> None:
    """
    Saves chat history to Redis with TTL (15 minutes).

    - Key: session:{session_id}:messages
    - Value: JSON string of messages list
    - TTL: 900 seconds

    Uses asyncio.to_thread to avoid blocking the event loop.
    """
    try:
        key = _build_key(session_id)

        # Serialize messages
        payload = json.dumps(messages)

        # Upstash SET with expiration (ex=seconds)
        await asyncio.to_thread(redis.set, key, payload, ex=3600)

        logger.info(f"Chat history saved for session={session_id} (TTL=3600s)")

    except Exception as e:
        logger.error(f"Error saving chat history for session={session_id}: {e}")
        # Do not raise — caching failure should not break main flow
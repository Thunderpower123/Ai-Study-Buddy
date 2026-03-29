import asyncio
import functools
from typing import Callable, Any, Coroutine

from utils.logging import get_logger

logger = get_logger(__name__)


def async_retry(retries: int = 3, delay: float = 1.0):
    """
    Decorator for retrying async functions.

    Args:
        retries: Number of retry attempts (default: 3)
        delay: Delay between retries in seconds (default: 1.0)

    Behavior:
        - Retries the async function if it raises an exception
        - Waits `delay` seconds between attempts
        - Logs each retry attempt
        - On final failure, re-raises the last exception

    Usage:
        @async_retry(retries=3, delay=1)
        async def call_openai(...):
            ...
    """

    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(1, retries + 1):
                try:
                    return await func(*args, **kwargs)

                except Exception as e:
                    last_exception = e

                    if attempt < retries:
                        logger.warning(
                            f"Retry {attempt}/{retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay} seconds..."
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"Final attempt {attempt}/{retries} failed for {func.__name__}: {e}"
                        )

            # Re-raise the last exception after all retries fail
            raise last_exception

        return wrapper

    return decorator
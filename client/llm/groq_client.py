from groq import AsyncGroq
from config.settings import settings
from utils.logging import get_logger

logger = get_logger(__name__)

client = AsyncGroq(api_key=settings.GROQ_API_KEY)


async def groq_chat(messages):
    try:
        res = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.2
        )
        return res.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq error: {e}")
        return ""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Required — app will crash on startup if missing
    # This is intentional: you cannot run the client without a service key
    SERVICE_KEY: str

    # Optional for now — default to empty string so app starts today without them
    # These will be filled in when the OpenAI key arrives in ~2 days
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = ""
    UPSTASH_REDIS_URL: str = ""
    UPSTASH_REDIS_TOKEN: str = ""

    class Config:
        env_file = ".env"


# Single instance — every other file imports this object
# Usage: from config.settings import settings
# Then: settings.OPENAI_API_KEY, settings.SERVICE_KEY, etc.
settings = Settings()

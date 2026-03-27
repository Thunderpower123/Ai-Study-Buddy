from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    # Required — app will crash on startup if missing
    # This is intentional: you cannot run the client without a service key
    SERVICE_KEY: str

    # Optional for now — default to empty string so app starts today without them
    # These will be filled in when the OpenAI key arrives in ~2 days
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = ""

    # Upstash Redis — variable names must match .env exactly
    # Upstash's own SDK uses REST_URL / REST_TOKEN naming
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # Port the FastAPI server listens on (read in uvicorn launch or startup logs)
    PORT: int = 8001

    # URL of the Node backend — used for any callbacks if needed
    BACKEND_URL: str = "http://localhost:8000"


# Single instance — every other file imports this object
# Usage: from config.settings import settings
# Then: settings.OPENAI_API_KEY, settings.SERVICE_KEY, etc.
settings = Settings()

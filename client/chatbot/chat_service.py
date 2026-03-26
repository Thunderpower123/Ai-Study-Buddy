from typing import List

from cache.redis_client import get_chat_history, save_chat_history
from rag.retrieve import retrieve_chunks
from chatbot.prompt_builder import build_prompt
from llm.openai_client import get_chat_response

from schemas.query import QueryRequest, QueryResponse, Source
from utils.logging import get_logger

logger = get_logger(__name__)


async def run_chat(body: QueryRequest) -> QueryResponse:
    """
    Main chat pipeline:

    1. Load chat history (Redis)
    2. Retrieve relevant chunks (RAG)
    3. Build prompt (mode + context + history + userProfile)
    4. Call OpenAI (LLM)
    5. Update chat history
    6. Save back to Redis
    7. Return structured response
    """

    try:
        logger.info(f"Chat request received | session={body.sessionId}")

        # Step 1: Load chat history
        chat_history: List[dict] = await get_chat_history(body.sessionId)
        logger.info(f"Loaded chat history: {len(chat_history)} messages")

        # Step 2: Retrieve chunks (context, sources, confidence)
        context, sources_raw, confidence = await retrieve_chunks(
            body.question,
            body.sessionId
        )

        if not context:
            logger.info("No context retrieved — proceeding with empty context.")

        # Step 3: Build prompt
        # FIX: pass body.userProfile so the system prompt is personalised
        # to the student's branch, year, and interests
        messages, mode = build_prompt(
            body.question,
            context,
            chat_history,
            user_profile=body.userProfile
        )

        logger.info(f"Prompt built | mode={mode} | messages={len(messages)}")

        # Step 4: Call OpenAI
        answer = await get_chat_response(messages)

        if not answer:
            logger.warning("Empty response from LLM.")

        # Step 5: Update chat history
        updated_history = chat_history + [
            {"role": "user", "content": body.question},
            {"role": "assistant", "content": answer}
        ]

        # Step 6: Save updated history to Redis
        await save_chat_history(body.sessionId, updated_history)
        logger.info("Chat history updated and saved.")

        # Step 7: Convert sources to Source objects
        sources = [
            Source(
                filename=s.get("filename", ""),
                section=s.get("section", "")
            )
            for s in sources_raw
        ]

        # Step 8: Return response
        return QueryResponse(
            success=True,
            answer=answer,
            mode=mode,
            sources=sources,
            confidence=confidence
        )

    except Exception as e:
        logger.error(f"Chat pipeline failed: {e}")

        # Fail-safe response (important for frontend stability)
        return QueryResponse(
            success=False,
            answer="Something went wrong while processing your request.",
            mode="grounded",
            sources=[],
            confidence="low"
        )

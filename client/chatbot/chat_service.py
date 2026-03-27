from typing import List

from cache.redis_client import get_chat_history, save_chat_history
from rag.retrieve import retrieve_chunks
from chatbot.prompt_builder import build_prompt
from llm.openai_client import get_chat_response

from schemas.query import QueryRequest, QueryResponse, Source
from utils.logging import get_logger

logger = get_logger(__name__)


async def run_chat(body: QueryRequest) -> QueryResponse:

    try:
        logger.info(f"Chat request received | session={body.sessionId}")

        # Step 1: Load chat history
        chat_history: List[dict] = await get_chat_history(body.sessionId)
        logger.info(f"Loaded chat history: {len(chat_history)} messages")

        # Step 2: Retrieval (pass history now)
        context, sources_raw, confidence = await retrieve_chunks(
            body.question,
            body.sessionId,
            chat_history
        )

        # 🔥 HARD ANTI-HALLUCINATION STOP
        if not context.strip():
            return QueryResponse(
                success=True,
                answer="I could not find this in your notes.",
                mode="grounded",
                sources=[],
                confidence="low"
            )

        # Step 3: Build prompt
        messages, mode = build_prompt(
            body.question,
            context,
            chat_history,
            user_profile=body.userProfile
        )

        logger.info(f"Prompt built | mode={mode} | messages={len(messages)}")

        # Step 4: LLM
        answer = await get_chat_response(messages)

        if not answer:
            logger.warning("Empty response from LLM.")

        # Step 5: Update history (only if answer is non-empty)
        if answer:
            updated_history = chat_history + [
                {"role": "user", "content": body.question},
                {"role": "assistant", "content": answer}
            ]
            # Step 6: Save Redis
            await save_chat_history(body.sessionId, updated_history)
        else:
            logger.warning("Empty LLM answer — chat history NOT updated.")

        # Step 7: Sources
        sources = [
            Source(
                filename=s.get("filename", ""),
                section=s.get("section", "")
            )
            for s in sources_raw
        ]

        return QueryResponse(
            success=True,
            answer=answer,
            mode=mode,
            sources=sources,
            confidence=confidence
        )

    except Exception as e:
        logger.error(f"Chat pipeline failed: {e}")

        return QueryResponse(
            success=False,
            answer="Something went wrong while processing your request.",
            mode="grounded",
            sources=[],
            confidence="low"
        )
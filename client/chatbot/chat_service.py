from typing import List

from cache.redis_client import get_chat_history, save_chat_history
from rag.retrieve import retrieve_chunks
from chatbot.prompt_builder import build_prompt, detect_meta_command, get_node_mode
from llm.openai_client import get_chat_response

from schemas.query import QueryRequest, QueryResponse, Source
from utils.logging import get_logger

logger = get_logger(__name__)


async def run_chat(body: QueryRequest) -> QueryResponse:

    try:
        session_id = body.get_session_id()
        user_profile = body.get_user_profile()
        question = body.question
        mode_hint = body.get_mode_hint()  # "grounded" | "general" | None — from frontend toggle

        logger.info(f"Chat request | session={session_id} | question={question[:80]}")

        # Step 1: Load Redis chat history
        chat_history: List[dict] = await get_chat_history(session_id)
        logger.info(f"Chat history loaded: {len(chat_history)} messages")

        # Step 2: Retrieve chunks
        # retrieve_chunks scales top_k and score_threshold based on query type
        context, sources_raw, confidence = await retrieve_chunks(
            question,
            session_id,
            chat_history
        )

        # Step 3: Handle empty context with specific messages per command type
        meta = detect_meta_command(question)

        if not context.strip():
            if meta == "notes":
                no_doc_answer = (
                    "There are no documents in this session to make notes from. "
                    "Upload your study materials (PDF, PPTX, DOCX, or TXT) first, "
                    "then ask me to make notes."
                )
            elif meta == "summarise":
                no_doc_answer = (
                    "You haven't uploaded any documents yet. "
                    "Upload your notes first, then ask me to summarise them."
                )
            elif meta == "key_concepts":
                no_doc_answer = (
                    "No documents uploaded yet. "
                    "Upload your notes first and I'll extract all key concepts."
                )
            elif meta == "quiz":
                no_doc_answer = (
                    "There's nothing to quiz you on yet. "
                    "Upload your study materials first and I'll generate a quiz."
                )
            elif meta == "study_plan":
                no_doc_answer = (
                    "I need your notes to create a study plan. "
                    "Upload your documents first."
                )
            else:
                no_doc_answer = "I could not find this in your notes."

            return QueryResponse(
                success=True,
                answer=no_doc_answer,
                mode="grounded",   # always Node-safe when returning early
                sources=[],
                confidence="low"
            )

        # Step 4: Build prompt
        # Pass mode_hint so build_prompt can force "extended" when the user
        # explicitly set the toggle to "general", overriding keyword detection.
        messages, internal_mode = build_prompt(
            question,
            context,
            chat_history,
            user_profile=user_profile,
            mode_hint=mode_hint,
        )

        logger.info(f"Prompt built | internal_mode={internal_mode} | messages={len(messages)}")

        # Step 5: Call GPT
        # Pass internal_mode so openai_client can scale max_tokens correctly
        answer = await get_chat_response(messages, mode=internal_mode)

        if not answer:
            logger.warning("Empty response from LLM.")

        # Step 6: Save to Redis history
        # We save even for meta-commands so the student can follow up
        # ("explain Q3 from the quiz in detail", "add more to the summary", etc.)
        if answer:
            updated_history = chat_history + [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer}
            ]
            await save_chat_history(session_id, updated_history)
        else:
            logger.warning("Empty answer — chat history NOT updated.")

        # Step 7: Build sources
        sources = [
            Source(
                filename=s.get("filename", ""),
                section=s.get("section", "")
            )
            for s in sources_raw
        ]

        # Step 8: Map internal mode → Node-safe mode
        # message.models.js only accepts enum ["grounded", "extended"]
        node_mode = get_node_mode(internal_mode)
        logger.info(f"Returning | internal_mode={internal_mode} → node_mode={node_mode}")

        return QueryResponse(
            success=True,
            answer=answer,
            mode=node_mode,
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

// controllers/chat.controller.js
import { Message } from "../models/message.models.js";
import { Session } from "../models/session.models.js";
import { ragService } from "../services/rag.services.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// 🔹 SEND MESSAGE
export const sendMessage = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { content, mode } = req.body;
  const userId = req.user._id;

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  // ✅ check session exists & belongs to user
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // ✅ 1. Save USER message
  const userMessage = await Message.create({
    sessionId,
    role: "user",
    content
  });

  // ✅ 2. Call RAG service (Python client)
  const ragResponse = await ragService.query({
    question: content,
    sessionId,
    userId,
    mode: mode || "grounded"
  });

  // ✅ 3. Save ASSISTANT message
  const assistantMessage = await Message.create({
    sessionId,
    role: "assistant",
    content: ragResponse.answer,
    sources: ragResponse.sources || [],
    confidence: ragResponse.confidence,
    mode: ragResponse.mode
  });

  // ✅ 4. Return response
  return res.status(200).json(
    new ApiResponse(200, {
      userMessage,
      assistantMessage,
      answer: ragResponse.answer,
      sources: ragResponse.sources || [],
      confidence: ragResponse.confidence,
      mode: ragResponse.mode
    }, "Message processed successfully")
  );
});


// 🔹 GET CHAT HISTORY
export const getChatHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  // check session ownership
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  const messages = await Message.find({ sessionId })
    .sort({ createdAt: 1 });

  return res.status(200).json(
    new ApiResponse(200, messages, "Chat history fetched")
  );
});

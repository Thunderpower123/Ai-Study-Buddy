// routes/chat.routes.js

import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chat.controller.js";
import verifyJWT from "../middleware/auth.middleware.js";

const router = express.Router();

// 🔐 Protected routes

// POST → send message + get AI response
router.post("/chat/:sessionId", verifyJWT, sendMessage);

// GET → full chat history
router.get("/chat/:sessionId", verifyJWT, getChatHistory);

export default router;
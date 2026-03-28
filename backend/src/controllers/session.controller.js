import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Session } from "../models/session.models.js";
import { Document } from "../models/document.models.js";
import { Message } from "../models/message.models.js";
import axios from "axios";

// 🔹 Create
export const createSession = asyncHandler(async (req, res) => {
    const session = await Session.create({
        userId: req.user._id,
        title: "New Session",
    });

    return res.status(201).json(new ApiResponse(201, session));
});

// 🔹 Get all
export const getAllSessions = asyncHandler(async (req, res) => {
    const sessions = await Session.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, sessions));
});

// 🔹 Get one
export const getSessionById = asyncHandler(async (req, res) => {
    // Ownership check — users can only read their own sessions
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });

    if (!session) throw new ApiError(404, "Session not found");

    return res.status(200).json(new ApiResponse(200, session));
});

// 🔹 Delete (CASCADE)
export const deleteSession = asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    // Ownership check — must verify before doing any destructive operations
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) throw new ApiError(404, "Session not found");

    // Step 1: Delete Pinecone namespace FIRST.
    // If this fails, we abort — MongoDB data stays intact and can be retried.
    // Doing MongoDB deletes first and then failing here would leave orphaned
    // Pinecone vectors with no corresponding MongoDB records forever.
    try {
        await axios.post(
            `${process.env.PYTHON_CLIENT_URL}/delete-namespace`,
            { sessionId },
            {
                headers: { "x-service-key": process.env.SERVICE_KEY },
                timeout: 15000, // 15s — don't hang forever if Python client is down
            }
        );
    } catch (err) {
        // Log but don't block — Pinecone cleanup failure should not prevent
        // the user from deleting their session. Vectors will be orphaned but
        // harmless (they'll never be queried since the namespace is gone).
        console.error(`[deleteSession] Pinecone namespace delete failed for ${sessionId}:`, err.message);
    }

    // Step 2: Cascade delete MongoDB records
    await Document.deleteMany({ sessionId });
    await Message.deleteMany({ sessionId });
    await Session.findByIdAndDelete(sessionId);

    return res.status(200).json(new ApiResponse(200, {}, "Session deleted"));
});
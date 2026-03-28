import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
    createSession,
    getAllSessions,
    getSessionById,
    deleteSession,
} from "../controllers/session.controller.js";

const router = Router();

router.post("/sessions", verifyJWT, createSession);
router.get("/sessions", verifyJWT, getAllSessions);
router.get("/sessions/:id", verifyJWT, getSessionById);
router.delete("/sessions/:id", verifyJWT, deleteSession);

export default router;
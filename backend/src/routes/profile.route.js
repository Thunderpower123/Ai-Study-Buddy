// backend/src/routes/profile.route.js
import express from "express";
import { getProfile, upsertProfile } from "../controllers/profile.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/profile", verifyJWT, getProfile);
router.put("/profile", verifyJWT, upsertProfile);

export default router;

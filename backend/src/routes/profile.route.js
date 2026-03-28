// backend/src/routes/profileRoutes.js
import express from "express";
const router  = express.Router();
const { getProfile, upsertProfile } = require("../controllers/profile.controller.js");
const verifyJWT = require("../middleware/auth.middleware.js");

router.get("/profile", verifyJWT, getProfile);
router.put("/profile", verifyJWT, upsertProfile);

export default router;
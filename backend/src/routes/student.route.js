// backend/src/routes/studentRoutes.js
import express from "express";
import { saveStudentDetails, getStudentDetails } from "../controllers/student.controller.js";
import verifyJWT from "../middleware/auth.middleware.js"; 

const router = express.Router();

router.post("/student-details", verifyJWT, saveStudentDetails);
router.get("/student-details", verifyJWT, getStudentDetails);

export default router;
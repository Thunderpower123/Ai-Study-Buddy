import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import {
    uploadDocument,
    listDocuments,
    deleteDocument,
} from "../controllers/document.controller.js";

const router = Router();

// upload.array("files", 20) — matches fd.append("files", f) in the frontend
// accepts up to 20 files per request; total size enforced in the controller
router.post("/sessions/:id/documents", verifyJWT, upload.array("files", 20), uploadDocument);
router.get("/sessions/:id/documents", verifyJWT, listDocuments);
router.delete("/documents/:id", verifyJWT, deleteDocument);

export default router;

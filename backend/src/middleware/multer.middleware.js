import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
    ];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, "Unsupported file type"), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter,
});
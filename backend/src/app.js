import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';

import authRouter    from "./routes/auth.route.js";
import studentRoutes from "./routes/student.route.js";
import profileRoutes from "./routes/profile.route.js";
import chatRoutes    from "./routes/chat.route.js";
import sessionRoutes from "./routes/session.route.js";
import documentRoutes from "./routes/document.route.js";



const app = express();

// --------------------
// Middleware
// --------------------
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-service-key"],
}));

// JSON limit: chat messages and profile data are small.
// Files come through multer (memoryStorage) which bypasses this middleware,
// so this limit does NOT affect file uploads — multer handles those separately.
// 1mb is plenty for any JSON payload this app will ever send.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// --------------------
// Routes
// --------------------
// Auth: /api/users/register  /api/users/login  /api/users/google  etc.
app.use("/api/users", authRouter);

// Student details: /api/student-details
app.use("/api", studentRoutes);

// Profile: /api/profile
app.use("/api", profileRoutes);

// Chat: /api/chat/:sessionId
app.use("/api", chatRoutes);

app.use("/api", sessionRoutes);
app.use("/api", documentRoutes);

// --------------------
// Health check
// --------------------
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "backend", port: process.env.PORT || 8000 });
});

// --------------------
// 404 handler
// --------------------
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// --------------------
// Multer error handler
// --------------------
// Multer throws MulterError synchronously during file processing — it bypasses
// asyncHandler entirely and lands here. Must be caught before the global handler
// so we return a proper JSON shape instead of Express's default HTML error page.
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // e.g. LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, LIMIT_UNEXPECTED_FILE
        const messages = {
            LIMIT_FILE_SIZE:      "File too large. Maximum size per file is 100 MB.",
            LIMIT_FILE_COUNT:     "Too many files. Maximum is 20 files per upload.",
            LIMIT_UNEXPECTED_FILE: `Unexpected field name '${err.field}'. Use 'files' as the field name.`,
        };
        return res.status(400).json({
            success: false,
            message: messages[err.code] || `Upload error: ${err.message}`,
        });
    }
    next(err);
});

// --------------------
// Global error handler
// --------------------
app.use((err, req, res, next) => {
    console.error("=== GLOBAL ERROR HANDLER ===");
    console.error(err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

export { app };

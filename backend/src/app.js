import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// --------------------
// Routes
// --------------------
import authRouter from "./routes/auth.route.js";
app.use("/api/auth", authRouter);

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
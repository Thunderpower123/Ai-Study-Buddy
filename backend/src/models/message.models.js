import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true,
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
    },
    content: {
        type: String,
        required: true,
    },
    sources: [
        {
            filename: String,
            section: String,
        },
    ],
    confidence: {
        type: String,
        enum: ["high", "medium", "low"],
    },
    mode: {
        type: String,
        enum: ["grounded", "extended"],
    },
}, { timestamps: true });

export const Message = mongoose.model("Message", messageSchema);

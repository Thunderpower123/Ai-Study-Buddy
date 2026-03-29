import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
    },
    type: {
        type: String,
        enum: ["qa", "file", "concept"],
    },
    question: String,
    answer: String,
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GeneratedFile",
    },
    reason: String,
}, { timestamps: true });

export const Highlight = mongoose.model("Highlight", highlightSchema);

import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        enum: ["pdf", "pptx", "docx", "text"],
    },
    totalChunks: {
        type: Number,
    },
    summary: {
        type: String,
    },
    cloudinaryUrl: {
        type: String, // Cloudinary secure_url returned after upload
    },
    cloudinaryPublicId: {
        type: String, // needed to delete the file from Cloudinary later
    },
}, { timestamps: true });

export const Document = mongoose.model("Document", documentSchema);

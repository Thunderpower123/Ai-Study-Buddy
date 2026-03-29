import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    branch:      { type: String, default: "" },
    year:        { type: Number },
    university:  { type: String, default: "" },
    bio:         { type: String, default: "" },
    interests:   { type: [String], default: [] },
    domains:     { type: [String], default: [] },
    linkedinUrl: { type: String, default: "" },
    githubUrl:   { type: String, default: "" },
}, { timestamps: true });

export const UserProfile = mongoose.model("UserProfile", userProfileSchema);

import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique:true
    },
    branch: String,
    year: Number,
    university: String,
    interests: [String],
    domains: [String],
    bio: String,
    linkedinUrl: String,
    githubUrl: String,
}, { timestamps: true });

export const UserProfile = mongoose.model("UserProfile", userProfileSchema); // FIXED: was userProfile (lowercase)

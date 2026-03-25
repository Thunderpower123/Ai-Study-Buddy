import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String, // null for Google users
    },
    googleId: {
        type: String, // null for normal users
    },
    avatar: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema); // FIXED: was Uesr

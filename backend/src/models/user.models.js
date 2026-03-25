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
}, { timestamps: true });

export const Uesr=mongoose.model("User", userSchema);


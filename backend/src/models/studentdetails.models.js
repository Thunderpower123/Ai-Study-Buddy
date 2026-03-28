import mongoose from "mongoose";

const studentDetailsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  education:    { type: String, enum: ["UG","PG","PhD"], required: true },
  stream:       { type: String, required: true, trim: true },
  yearOfPassing:{ type: Number, required: true },
  courseBranch: { type: String, required: true, trim: true },
  interests:    { type: [String], default: [] },
}, { timestamps: true });

export const StudentDetails = mongoose.model("StudentDetails", studentDetailsSchema);
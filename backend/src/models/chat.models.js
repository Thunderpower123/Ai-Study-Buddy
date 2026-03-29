import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  files: [
    {
      filename: String,
      url: String,
      mimetype: String,
    },
  ],
});

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    mode: {
      type: String,
      enum: ["grounded", "general"],
      default: "general",
    },
    messages: [messageSchema],
    files: [
      {
        filename: String,
        url: String,
        mimetype: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate title from first user message
chatSchema.pre("save", function (next) {
  if (
    this.messages.length > 0 &&
    this.title === "New Chat"
  ) {
    const firstMsg = this.messages.find((m) => m.role === "user");
    if (firstMsg) {
      this.title = firstMsg.content.slice(0, 50) + (firstMsg.content.length > 50 ? "..." : "");
    }
  }
  next();
});

export const Chat= mongoose.model("Chat", chatSchema);
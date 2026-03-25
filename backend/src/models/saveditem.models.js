const savedItemSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    question: String,
    answer: String,
  }, { timestamps: true });
  
  export const SavedItem=mongoose.model("SavedItem", savedItemSchema);
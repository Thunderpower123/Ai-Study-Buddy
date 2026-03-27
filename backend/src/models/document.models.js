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
      type: String, // 5-bullet summary
    },
  }, { timestamps: true });
  
  export const Document=mongoose.model("Document", documentSchema);
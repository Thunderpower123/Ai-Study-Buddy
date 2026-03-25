const generatedFileSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    filename: String,
    fileType: {
      type: String,
      enum: ["pdf", "docx"],
    },
    storagePath: String,
  }, { timestamps: true });
  
  export const GeneratedFile=mongoose.model("GeneratedFile", generatedFileSchema);
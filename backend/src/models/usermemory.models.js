const userMemorySchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fact: String,
    source: String,
  }, { timestamps: true });
  
  export const UserMemory=mongoose.model("UserMemory", userMemorySchema);
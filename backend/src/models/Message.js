import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    provider: String, // assistant ke message par: kaunse model ne jawab diya
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
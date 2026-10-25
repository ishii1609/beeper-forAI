import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  { id: String, severity: String, text: String },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  { round: Number, code: String, issues: [issueSchema] },
  { _id: false }
);

const codeReviewRunSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    spec: { type: String, required: true },
    status: { type: String, required: true }, // approved / unresolved / stuck
    roundsUsed: Number,
    finalCode: String,
    remainingIssues: [issueSchema],
    lowIssues: [issueSchema],
    rounds: [roundSchema],
    warning: String,
  },
  { timestamps: true }
);

export default mongoose.model("CodeReviewRun", codeReviewRunSchema);
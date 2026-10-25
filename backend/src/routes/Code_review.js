
import { Router } from "express";
import { runCodeReviewLoop } from "../services/Loop_test.js";
import CodeReviewRun from "../models/coderev.model.js";
import { authCheck } from "../middleware/auth_middleware.js";

const router = Router();

router.use(authCheck); // neeche ke sab routes ke liye login zaroori

router.post("/", async (req, res) => {
  const { spec } = req.body;

  if (typeof spec !== "string" || spec.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty spec is required." });
  }
  if (spec.length > 2000) {
    return res.status(400).json({ error: "The spec must be 2,000 characters or fewer." });
  }

  try {
    const result = await runCodeReviewLoop(spec.trim());

    let runId = null;
    try {
      const saved = await CodeReviewRun.create({
        userId: req.user._id,
        spec: spec.trim(),
        ...result,
      });
      runId = saved._id;
    } catch (saveErr) {
      console.error("Save failed:", saveErr.message);
    }

    res.json({ runId, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "The request could not be completed. Please try again." });
  }
});

router.get("/", async (req, res) => {
  try {
    const runs = await CodeReviewRun.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("spec status roundsUsed createdAt");
    res.json(runs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load runs." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const run = await CodeReviewRun.findOne({ _id: req.params.id, userId: req.user._id });
    if (!run) return res.status(404).json({ error: "Run not found." });
    res.json(run);
  } catch {
    res.status(400).json({ error: "Invalid run ID." });
  }
});

export default router;
import { Router } from "express";
import { ask, providerNames } from "../providers/index.js";
// authCheck ka import wahi line copy karo jo Code_review.js mein hai
import { authCheck } from "../middleware/auth_middleware.js";

const router = Router();
router.use(authCheck);

router.post("/", async (req, res) => {
  const { prompt } = req.body;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty prompt is required." });
  }
  if (prompt.length > 2000) {
    return res.status(400).json({ error: "The prompt must be 2,000 characters or fewer." });
  }

  // Sab providers ko ek saath bhejo. Ek fail ho toh baaki ka jawab phir bhi aaye.
  const results = await Promise.all(
    providerNames.map(async (provider) => {
      const start = Date.now();
      try {
        const text = await ask(provider, {
          system: "You are a helpful assistant. Answer clearly and concisely.",
          messages: [{ role: "user", content: prompt.trim() }],
        });
        return { provider, ok: true, text, ms: Date.now() - start };
      } catch (err) {
        console.error(`${provider} failed:`, err.message);
        return { provider, ok: false, error: "This model could not respond.", ms: Date.now() - start };
      }
    })
  );

  res.json({ results });
});

export default router;
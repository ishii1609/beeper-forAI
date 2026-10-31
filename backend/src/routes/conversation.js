import { Router } from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { ask, providerNames } from "../providers/index.js";
import { authCheck } from "../middleware/auth_middleware.js";

const router = Router();
router.use(authCheck);

const HISTORY_LIMIT = 20; // model ko sirf aakhri 20 messages bhejte hain
const SYSTEM = "You are a helpful assistant. Answer clearly and concisely.";

// Nayi chat banao
router.post("/", async (req, res) => {
  try {
    const convo = await Conversation.create({ userId: req.user._id });
    res.status(201).json(convo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create the chat." });
  }
});

// Meri saari chats
router.get("/", async (req, res) => {
  try {
    const list = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load chats." });
  }
});

// Ek chat ke saare messages
router.get("/:id", async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!convo) return res.status(404).json({ error: "Chat not found." });
    const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
    res.json({ conversation: convo, messages });
  } catch {
    res.status(400).json({ error: "Invalid chat ID." });
  }
});

// Message bhejo, model ka jawab pao
router.post("/:id/messages", async (req, res) => {
  const { content, provider } = req.body;

  if (typeof content !== "string" || content.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty message is required." });
  }
  if (content.length > 4000) {
    return res.status(400).json({ error: "The message must be 4,000 characters or fewer." });
  }
  if (!providerNames.includes(provider)) {
    return res.status(400).json({ error: "Unknown model provider." });
  }

  try {
    const convo = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!convo) return res.status(404).json({ error: "Chat not found." });

    // Pehle history nikaalo (aakhri 20), phir naya message jodo
    const past = await Message.find({ conversationId: convo._id })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT);
    const history = past.reverse().map((m) => ({ role: m.role, content: m.content }));
    const text = content.trim();

    let reply;
    try {
      reply = await ask(provider, {
        system: SYSTEM,
        messages: [...history, { role: "user", content: text }],
      });
    } catch (err) {
      console.error(`${provider} failed:`, err.message);
      return res.status(502).json({ error: "The model could not respond. Please try again." });
    }

    if (!reply) {
      return res.status(502).json({ error: "The model returned an empty response." });
    }

    // Jawab aane ke baad hi dono save karo, taaki adhoori jodi na bane
    const userMsg = await Message.create({ conversationId: convo._id, role: "user", content: text });
    const botMsg = await Message.create({
      conversationId: convo._id,
      role: "assistant",
      content: reply,
      provider,
    });

    if (convo.title === "New chat") convo.title = text.slice(0, 40);
    await convo.save(); // updatedAt bhi badal jaata hai

    res.json({ userMessage: userMsg, assistantMessage: botMsg, title: convo.title });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
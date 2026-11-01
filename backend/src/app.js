import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import Code_review from './routes/Code_review.js'
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import compareRoute from "./routes/compare.js";
import conversationRoutes from "./routes/conversation.js";

const app = express();
app.use(cors({ origin: "https://beeper-for-ai.vercel.app", credentials: true }));
app.use(express.json());
app.use(cookieParser());  
app.use("/api", chatRoutes);
app.use('/api/code-review-loop', Code_review);
        
app.use("/api/auth", authRoutes);
app.use("/api/compare", compareRoute);
app.use("/api/conversations", conversationRoutes);
export default app;

import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import Code_review from './routes/Code_review.js'
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import compareRoute from "./routes/compare.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());  
app.use("/api", chatRoutes);
app.use('/api/code-review-loop', Code_review);
        
app.use("/api/auth", authRoutes);
app.use("/api/compare", compareRoute);
export default app;

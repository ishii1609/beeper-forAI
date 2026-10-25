import { Router } from "express";
import { registerUser, loginUser, logoutUser, checkAuth } from "../controllers/authController.js";
import { authCheck } from "../middleware/auth_middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", authCheck, checkAuth);

export default router;
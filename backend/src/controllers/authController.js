import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user_model.js";

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax" };
};

function setAuthCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("token", token, { ...cookieOptions(), maxAge: 30 * 24 * 60 * 60 * 1000 });
}

const publicUser = (u) => ({ id: u._id, name: u.name, username: u.username, email: u.email });
const isText = (v) => typeof v === "string" && v.trim().length > 0;
const clean = (v) => v.trim().toLowerCase();

export async function registerUser(req, res) {
  try {
    const { name, username, email, password } = req.body;

    if (![name, username, email, password].every(isText)) {
      return res.status(400).json({ message: "Name, username, email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({
      $or: [{ email: clean(email) }, { username: clean(username) }],
    });
    if (existing) {
      return res.status(409).json({ message: "Username or email is already in use." });
    }

    const user = await User.create({
      name: name.trim(),
      username: clean(username),
      email: clean(email),
      password: await bcrypt.hash(password, 10),
    });

    setAuthCookie(res, user._id);
    res.status(201).json({ message: "Account created successfully.", user: publicUser(user) });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

export async function loginUser(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!isText(identifier) || !isText(password)) {
      return res.status(400).json({ message: "Email or username and password are required." });
    }

    const id = clean(identifier);
    const user = await User.findOne({ $or: [{ email: id }, { username: id }] });
    const valid = user && (await bcrypt.compare(password, user.password));

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    setAuthCookie(res, user._id);
    res.status(200).json({ message: "Logged in successfully.", user: publicUser(user) });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

export function logoutUser(req, res) {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({ message: "Logged out successfully." });
}

export function checkAuth(req, res) {
  // authCheck middleware ne user pehle hi load kar diya hai
  res.status(200).json({ user: publicUser(req.user) });
}
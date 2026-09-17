import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username || "");
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, username } = req.body || {};
    if (!name || !email || !password || !username) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, username, email và mật khẩu" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({ message: "Username chỉ gồm chữ, số, dấu gạch dưới, từ 3-20 ký tự" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Mật khẩu cần tối thiểu 6 ký tự" });
    }
    const usernameLower = username.toLowerCase();
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: usernameLower }] });
    if (existing) {
      return res.status(409).json({
        message: existing.email === email.toLowerCase() ? "Email này đã được đăng ký" : "Username này đã có người dùng",
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), username: usernameLower, password: hashed });
    const token = signToken(user);
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
    if (!user || !user.password) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error("[auth/login]", err);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// POST /auth/google  { idToken }
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: "Thiếu idToken" });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ message: "Không lấy được thông tin từ Google" });
    }
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        avatar: payload.picture,
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      if (!user.avatar) user.avatar = payload.picture;
      await user.save();
    }
    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error("[auth/google]", err);
    return res.status(401).json({ message: "Xác thực Google thất bại" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user.toPublicJSON() });
});

// PATCH /auth/username - dùng cho user đăng ký qua Google chưa có username
router.patch("/username", requireAuth, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!isValidUsername(username)) {
      return res.status(400).json({ message: "Username chỉ gồm chữ, số, dấu gạch dưới, từ 3-20 ký tự" });
    }
    const usernameLower = username.toLowerCase();
    const taken = await User.findOne({ username: usernameLower, _id: { $ne: req.user._id } });
    if (taken) {
      return res.status(409).json({ message: "Username này đã có người dùng" });
    }
    req.user.username = usernameLower;
    await req.user.save();
    return res.json({ user: req.user.toPublicJSON() });
  } catch (err) {
    console.error("[auth/username]", err);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/mailer.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

function buildVerifyUrl(token) {
  const base = process.env.BACKEND_URL || "";
  return `${base}/auth/verify-email?token=${token}`;
}

async function issueVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  user.verificationToken = token;
  user.verificationTokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: buildVerifyUrl(token) });
}

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
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: usernameLower,
      password: hashed,
      emailVerified: false,
    });
    try {
      await issueVerificationEmail(user);
    } catch (mailErr) {
      console.error("[auth/register] gửi email xác nhận thất bại:", mailErr.message);
      // Không xoá user đã tạo — cho phép dùng /auth/resend-verification thử lại sau
      return res.status(201).json({
        pendingVerification: true,
        email: user.email,
        message:
          "Tài khoản đã được tạo nhưng gửi email xác nhận thất bại. Vui lòng bấm \"Gửi lại email xác nhận\" ở màn hình đăng nhập.",
      });
    }
    // Không trả token — tài khoản phải xác nhận email trước mới đăng nhập được
    return res.status(201).json({
      pendingVerification: true,
      email: user.email,
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.",
    });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

// GET /auth/verify-email?token=...
// Người dùng bấm vào link trong email -> xác nhận -> chuyển hướng về app kèm kết quả
router.get("/verify-email", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "/";
  const redirect = (params) => {
    const url = new URL(frontendUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return res.redirect(url.toString());
  };
  try {
    const { token } = req.query;
    if (!token) {
      return redirect({ verify: "error", reason: "missing_token" });
    }
    const user = await User.findOne({ verificationToken: token }).select(
      "+verificationToken +verificationTokenExpires"
    );
    if (!user) {
      return redirect({ verify: "error", reason: "invalid_token" });
    }
    if (user.verificationTokenExpires && user.verificationTokenExpires.getTime() < Date.now()) {
      return redirect({ verify: "expired", email: user.email });
    }
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    return redirect({ verify: "success" });
  } catch (err) {
    console.error("[auth/verify-email]", err);
    return redirect({ verify: "error", reason: "server_error" });
  }
});

// POST /auth/resend-verification  { email }
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    // Trả lời giống nhau dù email có tồn tại hay không, tránh lộ thông tin email nào đã đăng ký
    const genericMsg = { message: "Nếu email tồn tại và chưa xác nhận, chúng tôi đã gửi lại email xác nhận." };
    if (!user || user.emailVerified) {
      return res.json(genericMsg);
    }
    await issueVerificationEmail(user);
    return res.json(genericMsg);
  } catch (err) {
    console.error("[auth/resend-verification]", err);
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
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư hoặc bấm gửi lại email xác nhận.",
        emailNotVerified: true,
        email: user.email,
      });
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
        emailVerified: true, // Google đã xác thực email này rồi
      });
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        if (!user.avatar) user.avatar = payload.picture;
        changed = true;
      }
      if (!user.emailVerified) {
        user.emailVerified = true; // đăng nhập Google thành công = email đã được Google xác thực
        changed = true;
      }
      if (changed) await user.save();
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

// PATCH /auth/profile - cập nhật họ tên, số điện thoại, địa chỉ
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name, phone, address } = req.body || {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "Họ tên không được để trống" });
      }
      req.user.name = String(name).trim();
    }
    if (phone !== undefined) req.user.phone = String(phone).trim();
    if (address !== undefined) req.user.address = String(address).trim();
    await req.user.save();
    return res.json({ user: req.user.toPublicJSON() });
  } catch (err) {
    console.error("[auth/profile]", err);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

export default router;

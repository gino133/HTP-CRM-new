import React, { useEffect, useRef, useState } from "react";
import { Mail, Lock, User as UserIcon, AtSign, Loader2, MailCheck } from "lucide-react";
import { register, login, loginWithGoogle, setUsername as apiSetUsername, resendVerification } from "../lib/authApi";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Chạy trong app đóng gói (Capacitor) hay trên trình duyệt web?
// Trên app native, dùng Google Sign-In SDK thật (qua plugin) thay vì popup web,
// vì popup web chọn xong tài khoản sẽ không có cách nào "quay lại" app đóng gói.
const isNativeApp = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.() === true;
const getNativeGoogleAuth = () => (typeof window !== "undefined" ? window.Capacitor?.Plugins?.GoogleAuth : null);

function inputStyle(C) {
  return {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: "12px",
    padding: "10px 12px 10px 38px",
    fontSize: "14px",
    color: C.text,
    outline: "none",
    backgroundColor: C.inputBg,
  };
}

export default function AuthScreen({ C, onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(null); // user object trả về từ Google nhưng chưa có username
  const [pickedUsername, setPickedUsername] = useState("");
  const [pendingEmail, setPendingEmail] = useState(null); // set khi vừa đăng ký xong, chờ xác nhận email
  const [unverifiedEmail, setUnverifiedEmail] = useState(null); // set khi login báo email chưa xác nhận
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent
  const [verifyNotice, setVerifyNotice] = useState(null); // { type: 'success'|'error'|'expired', email? }

  // Đọc kết quả từ link xác nhận email (backend redirect về đây kèm query param ?verify=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    if (verify) {
      setVerifyNotice({ type: verify, email: params.get("email"), reason: params.get("reason") });
      if (verify === "expired" && params.get("email")) setUnverifiedEmail(params.get("email"));
      // Xoá query param khỏi URL để bấm F5 không hiện lại thông báo
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleGoogleCredential = async (idToken) => {
    setError("");
    setLoading(true);
    try {
      const user = await loginWithGoogle(idToken);
      if (!user.username) {
        setNeedsUsername(user);
      } else {
        onAuthed(user);
      }
    } catch (e) {
      setError(e.message || "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  };

  // --- Luồng NATIVE (app Android/iOS đã đóng gói) ---
  const [nativeGoogleLoading, setNativeGoogleLoading] = useState(false);
  const handleNativeGoogleSignIn = async () => {
    const GoogleAuth = getNativeGoogleAuth();
    if (!GoogleAuth) {
      setError("Đăng nhập Google chưa sẵn sàng, vui lòng thử lại sau ít giây");
      return;
    }
    setError("");
    setNativeGoogleLoading(true);
    try {
      // initialize() an toàn để gọi nhiều lần - phòng trường hợp cấu hình plugin
      // trong capacitor.config.ts chưa được native layer đọc kịp lúc app vừa mở
      try {
        await GoogleAuth.initialize({ scopes: ["profile", "email"], serverClientId: GOOGLE_CLIENT_ID, forceCodeForRefreshToken: true });
      } catch (e) {}
      const result = await GoogleAuth.signIn();
      const idToken = result?.authentication?.idToken || result?.idToken;
      if (!idToken) {
        throw new Error("Không lấy được thông tin xác thực từ Google, vui lòng thử lại");
      }
      await handleGoogleCredential(idToken);
    } catch (e) {
      // Người dùng tự đóng hộp thoại chọn tài khoản -> không coi là lỗi
      const msg = e?.message || e?.error || "";
      if (!/cancel/i.test(String(msg))) {
        setError(typeof msg === "string" && msg ? msg : "Đăng nhập Google thất bại");
      }
    } finally {
      setNativeGoogleLoading(false);
    }
  };

  // --- Luồng WEB (chạy trong trình duyệt) ---
  // Nạp thư viện Google Identity Services 1 lần, dùng chung cho cả 2 tab đăng nhập/đăng ký
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || isNativeApp) return;
    const existing = document.getElementById("google-identity-script");
    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleCredential(response.credential),
      });
      setGoogleReady(true);
    };
    if (existing) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (isNativeApp) return;
    if (googleReady && googleBtnRef.current && window.google?.accounts?.id) {
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: mode === "register" ? "signup_with" : "signin_with",
      });
    }
  }, [googleReady, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail(null);
    if (!email || !password || (mode === "register" && (!name || !username))) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const result = await register({ name, email, password, username });
        setPendingEmail(result.email || email);
      } else {
        const user = await login({ email, password });
        onAuthed(user);
      }
    } catch (e) {
      if (e.emailNotVerified) {
        setUnverifiedEmail(e.email || email);
        setResendState("idle");
      } else {
        setError(e.message || "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (targetEmail) => {
    setResendState("sending");
    try {
      await resendVerification(targetEmail);
      setResendState("sent");
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra, vui lòng thử lại");
      setResendState("idle");
    }
  };

  const submitUsername = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(pickedUsername)) {
      setError("Username chỉ gồm chữ, số, dấu gạch dưới, từ 3-20 ký tự");
      return;
    }
    setLoading(true);
    try {
      const updated = await apiSetUsername(pickedUsername);
      onAuthed(updated);
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="w-full flex items-center justify-center px-6" style={{ height: "100dvh", backgroundColor: C.bg }}>
        <div className="w-full text-center" style={{ maxWidth: 360 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: C.navy }}>
            <MailCheck size={26} color="#fff" />
          </div>
          <div className="text-xl font-bold mb-2" style={{ color: C.text }}>Kiểm tra email của bạn</div>
          <div className="text-sm mb-1" style={{ color: C.sub }}>
            Chúng tôi đã gửi link xác nhận tới
          </div>
          <div className="text-sm font-semibold mb-6" style={{ color: C.text }}>{pendingEmail}</div>
          <div className="text-xs mb-6" style={{ color: C.sub }}>
            Bấm vào link trong email để kích hoạt tài khoản, sau đó quay lại đây để đăng nhập.
          </div>
          {resendState === "sent" ? (
            <div className="text-xs font-semibold mb-4" style={{ color: C.navy }}>Đã gửi lại email xác nhận!</div>
          ) : (
            <button
              onClick={() => handleResend(pendingEmail)}
              disabled={resendState === "sending"}
              className="text-xs font-semibold mb-4 flex items-center justify-center gap-1.5 mx-auto"
              style={{ color: C.navy, opacity: resendState === "sending" ? 0.6 : 1 }}
            >
              {resendState === "sending" && <Loader2 size={12} className="animate-spin" />}
              Không nhận được email? Gửi lại
            </button>
          )}
          {error && <div className="text-xs mb-4" style={{ color: C.red }}>{error}</div>}
          <button
            onClick={() => {
              setPendingEmail(null);
              setMode("login");
              setError("");
            }}
            className="w-full rounded-full py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: C.navy }}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (needsUsername) {
    return (
      <div className="w-full flex items-center justify-center px-6" style={{ height: "100dvh", backgroundColor: C.bg }}>
        <div className="w-full" style={{ maxWidth: 360 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: C.navy }}>
              <AtSign size={26} color="#fff" />
            </div>
            <div className="text-xl font-bold" style={{ color: C.text }}>Chọn username</div>
            <div className="text-sm mt-1" style={{ color: C.sub }}>
              Người khác sẽ dùng username này để mời bạn vào công việc chung
            </div>
          </div>
          <form onSubmit={submitUsername}>
            <div className="relative mb-1">
              <AtSign size={16} color={C.sub} style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                value={pickedUsername}
                onChange={(e) => setPickedUsername(e.target.value)}
                placeholder="username"
                style={inputStyle(C)}
                autoFocus
              />
            </div>
            {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-white"
              style={{ backgroundColor: C.navy, opacity: loading ? 0.7 : 1 }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Xác nhận
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex items-center justify-center px-6"
      style={{ height: "100dvh", backgroundColor: C.bg }}
    >
      <div className="w-full" style={{ maxWidth: 360 }}>
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: C.navy }}
          >
            <Lock size={26} color="#fff" />
          </div>
          <div className="text-xl font-bold" style={{ color: C.text }}>
            {mode === "register" ? "Tạo tài khoản" : "Đăng nhập"}
          </div>
          <div className="text-sm mt-1" style={{ color: C.sub }}>
            {mode === "register"
              ? "Tạo tài khoản để bắt đầu sử dụng"
              : "Đăng nhập để tiếp tục"}
          </div>
        </div>

        {verifyNotice && (
          <div
            className="text-xs mb-4 p-3 rounded-xl text-center font-semibold"
            style={
              verifyNotice.type === "success"
                ? { backgroundColor: C.navyBg || "#e0e7ff", color: C.navy }
                : { backgroundColor: C.redBg, color: C.red }
            }
          >
            {verifyNotice.type === "success" && "Xác nhận email thành công! Bạn có thể đăng nhập ngay."}
            {verifyNotice.type === "expired" && "Link xác nhận đã hết hạn. Bấm gửi lại email xác nhận bên dưới."}
            {verifyNotice.type === "error" && "Link xác nhận không hợp lệ hoặc đã được dùng."}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div className="relative mb-3">
                <UserIcon size={16} color={C.sub} style={{ position: "absolute", left: 12, top: 13 }} />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên"
                  style={inputStyle(C)}
                />
              </div>
              <div className="relative mb-3">
                <AtSign size={16} color={C.sub} style={{ position: "absolute", left: 12, top: 13 }} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (để người khác mời bạn cộng tác)"
                  style={inputStyle(C)}
                />
              </div>
            </>
          )}
          <div className="relative mb-3">
            <Mail size={16} color={C.sub} style={{ position: "absolute", left: 12, top: 13 }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={inputStyle(C)}
            />
          </div>
          <div className="relative mb-1">
            <Lock size={16} color={C.sub} style={{ position: "absolute", left: 12, top: 13 }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              style={inputStyle(C)}
            />
          </div>

          {error && (
            <div className="text-xs mt-2 mb-1" style={{ color: C.red }}>
              {error}
            </div>
          )}

          {unverifiedEmail && (
            <div className="text-xs mt-2 mb-1" style={{ color: C.sub }}>
              Email <span className="font-semibold" style={{ color: C.text }}>{unverifiedEmail}</span> chưa được xác nhận.{" "}
              {resendState === "sent" ? (
                <span className="font-semibold" style={{ color: C.navy }}>Đã gửi lại email xác nhận!</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleResend(unverifiedEmail)}
                  disabled={resendState === "sending"}
                  className="font-semibold underline"
                  style={{ color: C.navy }}
                >
                  {resendState === "sending" ? "Đang gửi..." : "Gửi lại email xác nhận"}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-white"
            style={{ backgroundColor: C.navy, opacity: loading ? 0.7 : 1 }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {mode === "register" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </form>

        {!!GOOGLE_CLIENT_ID && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
              <span className="text-xs" style={{ color: C.sub }}>hoặc</span>
              <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
            </div>
            {isNativeApp ? (
              <button
                type="button"
                onClick={handleNativeGoogleSignIn}
                disabled={nativeGoogleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold"
                style={{ border: `1px solid ${C.border}`, color: C.text, opacity: nativeGoogleLoading ? 0.7 : 1 }}
              >
                {nativeGoogleLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
                    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 39.7 16.4 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C39.9 37 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
                  </svg>
                )}
                {mode === "register" ? "Đăng ký với Google" : "Đăng nhập với Google"}
              </button>
            ) : (
              <div className="flex justify-center" ref={googleBtnRef} />
            )}
          </>
        )}

        <div className="text-center mt-6 text-sm" style={{ color: C.sub }}>
          {mode === "register" ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError("");
              setUnverifiedEmail(null);
              setMode(mode === "register" ? "login" : "register");
            }}
            className="font-semibold"
            style={{ color: C.navy }}
          >
            {mode === "register" ? "Đăng nhập" : "Đăng ký ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}

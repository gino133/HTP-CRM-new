import React, { useEffect, useRef, useState } from "react";
import { Mail, Lock, User as UserIcon, AtSign, Loader2, MailCheck } from "lucide-react";
import { register, login, loginWithGoogle, setUsername as apiSetUsername, resendVerification } from "../lib/authApi";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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

  const handleGoogleCredential = async (response) => {
    setError("");
    setLoading(true);
    try {
      const user = await loginWithGoogle(response.credential);
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

  // Nạp thư viện Google Identity Services 1 lần, dùng chung cho cả 2 tab đăng nhập/đăng ký
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.getElementById("google-identity-script");
    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
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
            <div className="flex justify-center" ref={googleBtnRef} />
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

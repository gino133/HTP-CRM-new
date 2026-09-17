import React, { useEffect, useRef, useState } from "react";
import { Mail, Lock, User as UserIcon, AtSign, Loader2 } from "lucide-react";
import { register, login, loginWithGoogle, setUsername as apiSetUsername } from "../lib/authApi";

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
    if (!email || !password || (mode === "register" && (!name || !username))) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      const user =
        mode === "register"
          ? await register({ name, email, password, username })
          : await login({ email, password });
      onAuthed(user);
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
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

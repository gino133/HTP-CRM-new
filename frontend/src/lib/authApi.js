// Kết nối tới htp-crm-backend cho phần đăng ký/đăng nhập.
// Chỉ lo phần tài khoản - dữ liệu CRM (khách hàng, báo giá...) vẫn ở localStorage như cũ.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "htp-crm-auth-token";

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {}
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok) {
    const err = new Error(data?.message || "Có lỗi xảy ra, vui lòng thử lại");
    // Giữ lại các field phụ (vd emailNotVerified, email) để UI xử lý riêng
    if (data && typeof data === "object") Object.assign(err, data);
    throw err;
  }
  return data;
}

// Trả về { pendingVerification: true, email, message } — không tự đăng nhập,
// vì tài khoản phải xác nhận email trước.
export async function register({ name, email, password, username }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, username }),
  });
  return data;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function resendVerification(email) {
  return request("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword({ token, password }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function loginWithGoogle(idToken) {
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  setToken(data.token);
  return data.user;
}

export async function fetchMe() {
  const data = await request("/auth/me", { method: "GET" });
  return data.user;
}

export async function setUsername(username) {
  const data = await request("/auth/username", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  });
  return data.user;
}

export async function updateProfile({ name, phone, address }) {
  const data = await request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, phone, address }),
  });
  return data.user;
}

export function logout() {
  clearToken();
}

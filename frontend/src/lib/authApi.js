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
    throw new Error(data?.message || "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data;
}

export async function register({ name, email, password, username }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, username }),
  });
  setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
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

export function logout() {
  clearToken();
}

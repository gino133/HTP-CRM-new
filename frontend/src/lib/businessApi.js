import { getToken } from "./authApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

export const listBusinesses = () => request("/businesses").then((d) => d.businesses);

export const createBusiness = (payload) =>
  request("/businesses", { method: "POST", body: JSON.stringify(payload) }).then((d) => d.business);

export const renameBusiness = (id, name) =>
  request(`/businesses/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }).then((d) => d.business);

export const deleteBusinessApi = (id) => request(`/businesses/${id}`, { method: "DELETE" });

export const getBusinessData = (id) => request(`/businesses/${id}/data`).then((d) => d.data);

export const putBusinessData = (id, data) =>
  request(`/businesses/${id}/data`, { method: "PUT", body: JSON.stringify(data) });

export const inviteToBusiness = (id, username) =>
  request(`/businesses/${id}/invite`, { method: "POST", body: JSON.stringify({ username }) }).then((d) => d.business);

export const removeMember = (id, userId) =>
  request(`/businesses/${id}/members/${userId}`, { method: "DELETE" }).then((d) => d.business);

export const listInvites = () => request("/invites").then((d) => d.invites);

export const acceptInvite = (businessId) => request(`/invites/${businessId}/accept`, { method: "POST" });

export const declineInvite = (businessId) => request(`/invites/${businessId}/decline`, { method: "POST" });

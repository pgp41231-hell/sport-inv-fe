export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://spot-inv-be.vercel.app/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, user, query, signal } = options;
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (user) {
    headers["x-user-id"] = user.id;
    headers["x-user-email"] = user.email;
    headers["x-user-name"] = user.name;
    headers["x-user-role"] = user.role;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || `Request failed (${response.status})`, response.status, payload?.error);
  }
  return payload;
}

export const api = {
  health: () => apiRequest("/health"),
  publicVenues: (query) => apiRequest("/public/venues", { query }),
  publicEquipment: () => apiRequest("/public/equipment"),
  publicContent: (type) => apiRequest(`/public/${type}`),
  me: (user) => apiRequest("/me", { user }),
  bookings: (user) => apiRequest("/bookings", { user }),
  createBooking: (user, body) => apiRequest("/bookings", { method: "POST", user, body }),
  cancelBooking: (user, id) => apiRequest(`/bookings/${id}/cancel`, { method: "POST", user }),
  pendingApprovals: (user) => apiRequest("/approvals/pending", { user }),
  decideApproval: (user, id, body) => apiRequest(`/approvals/${id}/decision`, { method: "POST", user, body }),
  createVenue: (user, body) => apiRequest("/venues", { method: "POST", user, body }),
  createEquipment: (user, body) => apiRequest("/equipment", { method: "POST", user, body }),
  audit: (user) => apiRequest("/admin/audit-log", { user, query: { limit: 12 } }),
};

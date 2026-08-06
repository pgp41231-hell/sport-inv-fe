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

/**
 * True when the backend does not have this endpoint (or route) at all.
 *
 * EPIC-03/04 note: the frontend must stay usable against a backend deployed
 * before the holds and recommendations APIs merged, so callers treat this as
 * "feature unavailable" and fall back, rather than as an error to show the user.
 */
export const isMissingEndpoint = (error) =>
  error instanceof ApiError && (error.status === 404 || error.status === 501);

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

  // --- EPIC-03 / EPIC-04 -----------------------------------------------------

  // Occupied slots, plus the blackout and hold layers on backends that send them.
  availability: (query) => apiRequest("/public/availability", { query }),

  // Slot holds (US-04B). All four may 404 on an older backend; callers check
  // isMissingEndpoint and continue without the lock rather than failing.
  publicHolds: (query) => apiRequest("/public/holds", { query }),
  createHold: (user, body) => apiRequest("/holds", { method: "POST", user, body }),
  releaseHold: (user, id) => apiRequest(`/holds/${id}`, { method: "DELETE", user }),
  myHolds: (user) => apiRequest("/holds/mine", { user }),

  // Alternative slots (US-05B). Falls back to recommendSlotsLocally in src/lib/slots.js.
  recommendations: (query) => apiRequest("/public/recommendations", { query }),
};

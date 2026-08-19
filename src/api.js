import { authEmailRedirectTo, supabase, supabaseConfigured } from "./supabase.js";

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
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  } else if (user) {
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
  authConfig: () => apiRequest("/auth/config"),
  signup: async (body) => {
    if (!supabaseConfigured) {
      const created = await apiRequest("/auth/signup", { method: "POST", body });
      if (created.data?.token) await apiRequest("/auth/logout", { method: "POST", user: { token: created.data.token } });
      return { data: { email: body.email.toLowerCase(), requiresEmailConfirmation: false, message: "Account created successfully. Sign in with your new credentials." } };
    }
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: { name: body.name },
        emailRedirectTo: authEmailRedirectTo,
      },
    });
    if (error) throw new ApiError(error.message, error.status || 400);
    if (data.session) await supabase.auth.signOut();
    return { data: { email: body.email.toLowerCase(), requiresEmailConfirmation: !data.session, message: data.session ? "Account created successfully. Sign in with your new credentials." : "Account created. Check your institute email to confirm it, then sign in." } };
  },
  login: async (body) => {
    if (!supabaseConfigured) return apiRequest("/auth/login", { method: "POST", body });
    const { data, error } = await supabase.auth.signInWithPassword(body);
    if (error) {
      const message = /email not confirmed/i.test(error.message)
        ? "Confirm your email using the verification link sent to your inbox before signing in."
        : error.message;
      throw new ApiError(message, error.status || 401);
    }
    const tokenUser = { token: data.session.access_token };
    return { data: { user: (await apiRequest("/me", { user: tokenUser })).data, token: data.session.access_token, expiresAt: new Date(data.session.expires_at * 1000).toISOString() } };
  },
  logout: async (user) => {
    if (supabaseConfigured) { const { error } = await supabase.auth.signOut(); if (error) throw new ApiError(error.message, 400); return; }
    return apiRequest("/auth/logout", { method: "POST", user });
  },
  changePassword: async (user, password) => {
    if (!supabaseConfigured) throw new ApiError("Supabase is not configured", 503);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new ApiError(error.message, error.status || 400);
    return apiRequest("/account/password-changed", { method: "POST", user });
  },
  publicVenues: (query) => apiRequest("/public/venues", { query }),
  publicEquipment: () => apiRequest("/public/equipment"),
  equipmentCatalog: () => apiRequest("/public/equipment-catalog"),
  publicContent: (type) => apiRequest(`/public/${type}`),
  me: (user) => apiRequest("/me", { user }),
  bookings: (user) => apiRequest("/bookings", { user }),
  createBooking: (user, body) => apiRequest("/bookings", { method: "POST", user, body }),
  cancelBooking: (user, id) => apiRequest(`/bookings/${id}/cancel`, { method: "POST", user }),
  pendingApprovals: (user) => apiRequest("/approvals/pending", { user }),
  decideApproval: (user, id, body) => apiRequest(`/approvals/${id}/decision`, { method: "POST", user, body }),
  createVenue: (user, body) => apiRequest("/venues", { method: "POST", user, body }),
  venues: (user) => apiRequest("/venues", { user }),
  updateVenue: (user, id, body) => apiRequest(`/venues/${id}`, { method: "PATCH", user, body }),
  createEquipment: (user, body) => apiRequest("/equipment", { method: "POST", user, body }),
  equipmentInventory: (user) => apiRequest("/equipment", { user }),
  updateEquipment: (user, id, body) => apiRequest(`/equipment/${id}`, { method: "PATCH", user, body }),
  audit: (user) => apiRequest("/admin/audit-log", { user, query: { limit: 12 } }),
  adminUsers: (user) => apiRequest("/admin/users", { user }),
  setUserRole: (user, id, role) => apiRequest(`/admin/users/${id}/role`, { method: "PATCH", user, body: { role } }),
  roleAssignments: (user) => apiRequest("/admin/role-assignments", { user }),
  addRoleAssignment: (user, body) => apiRequest("/admin/role-assignments", { method: "POST", user, body }),
  removeRoleAssignment: (user, email) => apiRequest(`/admin/role-assignments/${encodeURIComponent(email)}`, { method: "DELETE", user }),
  authSettings: (user) => apiRequest("/admin/auth-settings", { user }),
  updateAuthSettings: (user, emailPattern) => apiRequest("/admin/auth-settings", { method: "PUT", user, body: { emailPattern } }),
  equipmentSports: (user) => apiRequest("/equipment-module/sports", { user }),
  equipmentTeams: (user) => apiRequest("/equipment-module/teams", { user }),
  equipmentRequests: (user) => apiRequest("/equipment-module/requests", { user }),
  createEquipmentRequest: (user, body) => apiRequest("/equipment-module/requests", { method: "POST", user, body }),
  decideEquipmentRequest: (user, id, body) => apiRequest(`/equipment-module/requests/${id}/decision`, { method: "POST", user, body }),
  equipmentQr: (user, id) => apiRequest(`/equipment-module/requests/${id}/qr`, { method: "POST", user }),
  inspectEquipmentQr: (user, token) => apiRequest("/equipment-module/kiosk/inspect", { method: "POST", user, body: { token } }),
  confirmEquipmentQr: (user, token, outcomes = [], assetScans = []) => apiRequest("/equipment-module/kiosk/confirm", { method: "POST", user, body: { token, outcomes, assetScans } }),
  equipmentAudit: (user, query) => apiRequest("/equipment-module/audit", { user, query }),
  equipmentInventoryOverview: (user, query) => apiRequest("/equipment-module/inventory", { user, query }),
  transferEquipmentState: (user, id, body) => apiRequest(`/equipment-module/inventory/${id}/transfer`, { method: "POST", user, body }),
  resolveEquipmentException: (user, id, action) => apiRequest(`/equipment-module/inventory/${id}/resolve`, { method: "POST", user, body: { action } }),
  createSport: (user, body) => apiRequest("/admin/sports", { method: "POST", user, body }),
  updateSport: (user, id, body) => apiRequest(`/admin/sports/${id}`, { method: "PATCH", user, body }),
  setSportPocs: (user, id, body) => apiRequest(`/admin/sports/${id}/pocs`, { method: "PUT", user, body }),
  assignSportCaptain: (user, id, email) => apiRequest(`/admin/sports/${id}/captain`, { method: "PUT", user, body: { email } }),
  createTeam: (user, body) => apiRequest("/admin/teams", { method: "POST", user, body }),
  updateTeam: (user, id, body) => apiRequest(`/admin/teams/${id}`, { method: "PATCH", user, body }),
  createInventoryKiosk: (user, password) => apiRequest("/admin/inventory-kiosk", { method: "POST", user, body: { password } }),
  createEquipmentAssets: (user, id, assets) => apiRequest(`/admin/equipment/${id}/assets`, { method: "POST", user, body: { assets } }),
  createCampusLocation: (user, body) => apiRequest("/admin/campus-locations", { method: "POST", user, body }),
  updateCampusLocation: (user, id, body) => apiRequest(`/admin/campus-locations/${id}`, { method: "PATCH", user, body }),

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

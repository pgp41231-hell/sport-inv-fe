import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Supabase redirects confirmation links only to allow-listed URLs. Configure
// VITE_SITE_URL with the deployed frontend URL; local development falls back
// to the current browser origin.
export const authEmailRedirectTo = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

import { supabase, supabaseConfigured } from "./supabase.js";

export const SPORTS_MEDIA_BUCKET = "sports-media";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export function validatePhoto(file) {
  if (!file) return;
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Photo must be a JPG, PNG, or WebP image");
  if (file.size > MAX_BYTES) throw new Error("Photo must be 5MB or smaller");
}

export async function compressPhoto(file) {
  validatePhoto(file);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not compress this image")), "image/webp", 0.82));
  if (blob.size > MAX_BYTES) throw new Error("Compressed photo is still larger than 5MB");
  return blob;
}

export async function uploadRecordPhoto(kind, recordId, file) {
  if (!file) return null;
  if (!supabaseConfigured) throw new Error("Supabase Storage is not configured");
  const body = await compressPhoto(file);
  const path = `${kind}/${recordId}/photo.webp`;
  const { error } = await supabase.storage.from(SPORTS_MEDIA_BUCKET).upload(path, body, { contentType: "image/webp", cacheControl: "3600", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export function publicPhotoUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!supabaseConfigured) return null;
  return supabase.storage.from(SPORTS_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

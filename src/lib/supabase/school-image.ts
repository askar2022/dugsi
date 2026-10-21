import type { SupabaseClient } from "@supabase/supabase-js";

export const SCHOOL_IMAGE_BUCKET = "school-images";
export const MAX_SCHOOL_IMAGE_BYTES = 5 * 1024 * 1024;
export const SCHOOL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function schoolImageExt(type: string) {
  return EXT[type] ?? null;
}

export function schoolImagePath(tenantId: string, ext: string) {
  return `${tenantId}/profile.${ext}`;
}

export async function listSchoolImagePath(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase.storage.from(SCHOOL_IMAGE_BUCKET).list(tenantId, {
    limit: 20,
  });
  if (error || !data?.length) return null;
  const file = data.find((item) => item.name.startsWith("profile."));
  return file ? `${tenantId}/${file.name}` : null;
}

export async function signedSchoolImageUrl(supabase: SupabaseClient, tenantId: string) {
  const path = await listSchoolImagePath(supabase, tenantId);
  if (!path || !path.startsWith(`${tenantId}/`)) return null;
  const { data, error } = await supabase.storage
    .from(SCHOOL_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function removeSchoolImages(supabase: SupabaseClient, tenantId: string) {
  const { data } = await supabase.storage.from(SCHOOL_IMAGE_BUCKET).list(tenantId, { limit: 20 });
  const paths = (data ?? [])
    .filter((item) => item.name.startsWith("profile."))
    .map((item) => `${tenantId}/${item.name}`)
    .filter((path) => path.startsWith(`${tenantId}/`));
  if (!paths.length) return;
  await supabase.storage.from(SCHOOL_IMAGE_BUCKET).remove(paths);
}

export const SCHOOL_COOKIE = "dugsi_school";

export function schoolFromCookie(value?: string | null) {
  const code = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9-]{2,20}$/.test(code) ? code : "";
}

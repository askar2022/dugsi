import type { Role } from "@/lib/types";

export type SchoolLoginPortal = "parent" | "teacher" | "admin" | "staff";

export function roleLoginPath(role: Role | string, schoolCode?: string | null, next?: string | null) {
  if (role === "PARENT") return schoolLoginPath("parent", schoolCode, next);
  if (role === "TEACHER") return schoolLoginPath("teacher", schoolCode, next);
  if (role === "PLATFORM") return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return schoolLoginPath("admin", schoolCode, next);
}

export function schoolLoginPath(
  portal: SchoolLoginPortal,
  schoolCode?: string | null,
  next?: string | null,
) {
  const code = schoolCode?.trim().toLowerCase();
  const page = portal === "staff" ? "teacher" : portal;
  const path = code ? `/${code}/${page}` : page === "admin" ? "/login" : `/login/${page === "teacher" ? "staff" : page}`;
  if (!next) return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

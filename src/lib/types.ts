export const ROLES = ["PLATFORM", "ADMIN", "TEACHER", "PARENT", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
};

export const SCHOOL_ROLES: Role[] = ["ADMIN", "TEACHER", "PARENT", "STAFF"];

export function portalForRole(role: Role) {
  if (role === "ADMIN" || role === "STAFF") return "/admin";
  if (role === "TEACHER") return "/teacher";
  if (role === "PARENT") return "/parent";
  return "/platform";
}

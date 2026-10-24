import type { Role } from "@/lib/types";

export const STAFF_POSITION_GROUPS = [
  {
    portal: "ADMIN" as const,
    label: "Admin Portal",
    positions: [
      "Dugsi Director / Imam",
      "Administrator",
      "Manager",
      "Finance / Accountant",
      "Enrollment Coordinator",
      "Receptionist",
    ],
  },
  {
    portal: "TEACHER" as const,
    label: "Teacher Portal",
    positions: ["Teacher", "Teaching Assistant", "Substitute Teacher"],
  },
  {
    portal: "PARENT" as const,
    label: "Parent Portal",
    positions: ["Parent / Guardian"],
  },
  {
    portal: null,
    label: "No Portal Access",
    positions: ["Driver", "Security", "Cleaner / Custodian", "Volunteer", "Other"],
  },
] as const;

export const STAFF_POSITIONS = STAFF_POSITION_GROUPS.flatMap((group) => [...group.positions]);

const TEACHING_POSITIONS = new Set<string>([
  "Teacher",
  "Teaching Assistant",
  "Substitute Teacher",
]);

export function portalForPosition(title?: string | null): Role | null {
  if (!title) return null;
  for (const group of STAFF_POSITION_GROUPS) {
    if ((group.positions as readonly string[]).includes(title)) return group.portal;
  }
  return null;
}

export function needsAssignedClass(title?: string | null) {
  return Boolean(title && TEACHING_POSITIONS.has(title));
}

export function portalLabel(role?: Role | string | null) {
  if (role === "ADMIN" || role === "STAFF") return "Admin";
  if (role === "TEACHER") return "Teacher";
  if (role === "PARENT") return "Parent";
  return "None";
}

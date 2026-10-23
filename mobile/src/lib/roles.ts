import type { Href } from "expo-router";

export function homeHref(role: string): Href {
  if (role === "TEACHER") return "/(teacher)";
  if (role === "ADMIN" || role === "STAFF") return "/(office)";
  return "/(app)";
}

export function roleLabel(role: string) {
  if (role === "TEACHER") return "Teacher";
  if (role === "ADMIN" || role === "STAFF") return "Office";
  return "Parent";
}

export function isSchoolRole(role: string) {
  return role === "PARENT" || role === "TEACHER" || role === "ADMIN" || role === "STAFF";
}

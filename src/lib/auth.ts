export function normalizeSchoolCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

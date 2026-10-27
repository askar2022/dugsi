export function isDemoSchool(slug?: string | null) {
  return slug?.trim().toLowerCase() === "noor";
}

export function skipAdminLoginCode(input: {
  slug?: string | null;
  tenantId?: string | null;
  email?: string | null;
}) {
  if (isDemoSchool(input.slug)) return true;
  if (input.tenantId?.trim() === "sample-noor") return true;
  const email = input.email?.trim().toLowerCase() ?? "";
  return email.endsWith("@noor.dugsi");
}

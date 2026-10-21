import type { SupabaseClient } from "@supabase/supabase-js";

export async function findParentIdByEmail(
  admin: SupabaseClient,
  tenantId: string,
  email?: string | null,
) {
  const value = email?.trim().toLowerCase();
  if (!value) return null;
  const { data } = await admin
    .from("User")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("role", "PARENT")
    .eq("email", value)
    .maybeSingle();
  return data?.id ?? null;
}

export async function attachChildrenToParent(
  admin: SupabaseClient,
  tenantId: string,
  parentId: string,
  parentEmail?: string | null,
) {
  const email = parentEmail?.trim().toLowerCase();
  const ids = new Set<string>();

  if (email) {
    const { data: applications } = await admin
      .from("EnrollmentApplication")
      .select("studentId")
      .eq("tenantId", tenantId)
      .eq("parentEmail", email);
    for (const row of applications ?? []) {
      if (row.studentId) ids.add(row.studentId);
    }
  }

  const { data: already } = await admin
    .from("Student")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("parentId", parentId);
  for (const row of already ?? []) ids.add(row.id);

  if (ids.size === 0) return;

  await admin
    .from("Student")
    .update({ parentId })
    .eq("tenantId", tenantId)
    .in("id", [...ids])
    .is("parentId", null);
}

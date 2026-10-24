import { error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { ensureSchoolLogin } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { teacherJoinSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = teacherJoinSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter your full name, phone, username, and password.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return error("School not found.", 404);

  let login: { userId: string; email: string; created: boolean };
  try {
    login = await ensureSchoolLogin({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      name: parsed.data.name.trim(),
      username: parsed.data.username,
      password: parsed.data.password,
      phone: parsed.data.phone.trim(),
      role: "TEACHER",
      requirePassword: true,
      status: "inactive",
    });
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not create that teacher login.");
  }

  if (!login.created) {
    const { data: existing } = await admin
      .from("User")
      .select("status")
      .eq("id", login.userId)
      .maybeSingle();
    if (existing?.status === "inactive") {
      return error("The office has not approved this teacher login yet.");
    }
    return error("That username already has a login. Sign in instead.");
  }

  const { error: staffError } = await admin.from("Staff").insert({
    tenantId: tenant.id,
    userId: login.userId,
    name: parsed.data.name.trim(),
    email: login.email,
    phone: parsed.data.phone.trim(),
    title: "Teacher",
    status: "inactive",
    notes: "Created from teacher sign-in.",
  });
  if (staffError && !/duplicate|unique/i.test(staffError.message)) {
    return error(staffError.message || "Could not save that teacher account.");
  }

  return json({
    ok: true,
    message: "Your teacher account is waiting for the office to approve it.",
  }, 201);
}

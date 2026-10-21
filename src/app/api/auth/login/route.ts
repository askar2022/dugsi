import { applyCors, error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCookieClient, publicUser } from "@/lib/supabase/request";
import { loginSchema } from "@/lib/validators";
import type { Role } from "@/lib/types";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter your school code, email, and password.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const email = parsed.data.email.trim().toLowerCase();
  const supabase = await createCookieClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (signInError || !data.user || !data.session) {
    return error("Those details do not match a school account.", 401);
  }

  const admin = createAdminClient();
  let profile: { id: string; name: string; role: string; tenantId: string | null } | null = null;
  let tenant: { id: string; slug: string; name: string; status: string } | null = null;

  if (slug === "platform") {
    const { data: row } = await admin
      .from("User")
      .select("id, name, role, tenantId")
      .eq("id", data.user.id)
      .maybeSingle();
    profile = row;
    if (!profile || profile.role !== "PLATFORM") {
      await supabase.auth.signOut();
      return error("Those details do not match a school account.", 401);
    }
  } else {
    const { data: school } = await admin
      .from("Tenant")
      .select("id, slug, name, status")
      .eq("slug", slug)
      .maybeSingle();
    tenant = school;
    if (!tenant || tenant.status === "suspended") {
      await supabase.auth.signOut();
      return error("Those details do not match a school account.", 401);
    }

    const { data: byId } = await admin
      .from("User")
      .select("id, name, role, tenantId")
      .eq("id", data.user.id)
      .eq("tenantId", tenant.id)
      .maybeSingle();
    profile = byId;
    if (!profile) {
      const { data: byEmail } = await admin
        .from("User")
        .select("id, name, role, tenantId")
        .eq("email", email)
        .eq("tenantId", tenant.id)
        .maybeSingle();
      profile = byEmail;
    }
    if (!profile) {
      await supabase.auth.signOut();
      return error("Those details do not match a school account.", 401);
    }
  }

  const app = data.user.app_metadata ?? {};
  if (app.tenant_id !== profile.tenantId || app.role !== profile.role) {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        role: profile.role,
        tenant_id: profile.tenantId,
        tenant_slug: tenant?.slug ?? null,
        tenant_name: tenant?.name ?? null,
      },
    });
    await supabase.auth.refreshSession();
  }

  const { data: refreshed } = await supabase.auth.getSession();
  const accessToken = refreshed.session?.access_token ?? data.session.access_token;

  return json({
    token: accessToken,
    user: publicUser({
      userId: data.user.id,
      email,
      name: profile.name,
      role: profile.role as Role,
      tenantId: profile.tenantId,
      tenantSlug: tenant?.slug ?? null,
      tenantName: tenant?.name ?? null,
    }),
  });
}

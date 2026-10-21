import { applyCors, error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCookieClient, publicUser } from "@/lib/supabase/request";
import { registerTenantSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerTenantSchema.safeParse(body);
  if (!parsed.success) {
    return error("Check the school name, school code, and admin details.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  if (!slug || slug === "platform") {
    return error("Choose a different school code.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("Tenant").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    return error("That school code is already in use. Pick another.");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.dugsiName.trim();
  const { data: tenant, error: tenantError } = await admin
    .from("Tenant")
    .insert({
      name,
      slug,
      email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      status: "active",
      welcomeNote: `Assalamu alaikum and welcome to ${name}.`,
    })
    .select("*")
    .single();

  if (tenantError || !tenant) {
    return error(tenantError?.message ?? "Could not create this dugsi.");
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.adminName.trim() },
    app_metadata: {
      role: "ADMIN",
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      tenant_name: tenant.name,
    },
  });

  if (userError || !created.user) {
    await admin.from("Tenant").delete().eq("id", tenant.id);
    return error(userError?.message ?? "Could not create the admin login.");
  }

  const { error: profileError } = await admin.from("User").insert({
    id: created.user.id,
    tenantId: tenant.id,
    email,
    name: parsed.data.adminName.trim(),
    role: "ADMIN",
    phone: parsed.data.phone,
    status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("Tenant").delete().eq("id", tenant.id);
    return error(profileError.message);
  }

  const supabase = await createCookieClient();
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (signInError || !sessionData.session) {
    return error("School created. Sign in with your school code and email.");
  }

  return json(
    {
      token: sessionData.session.access_token,
      user: publicUser({
        userId: created.user.id,
        email,
        name: parsed.data.adminName.trim(),
        role: "ADMIN",
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      }),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    },
    201,
  );
}

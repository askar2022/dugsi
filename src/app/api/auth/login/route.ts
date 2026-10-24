import { applyCors, error, json } from "@/lib/http";
import {
  adminCodeDestination,
  attachAdminOtpCookies,
  clearAdminOtpCookies,
  isAdminLoginRole,
  maskEmail,
} from "@/lib/admin-otp";
import { sendAdminLoginCode } from "@/lib/admin-otp-send";
import { normalizeSchoolCode } from "@/lib/auth";
import { resolveSchoolLoginEmail } from "@/lib/parent-account";
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
    return error("Enter your school code, username, and password.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const username = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();
  let email = username;

  if (slug && slug !== "platform") {
    const { data: school } = await admin
      .from("Tenant")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (school) {
      email = await resolveSchoolLoginEmail({
        tenantId: school.id,
        schoolCode: school.slug,
        username,
      });
    }
  }

  const supabase = await createCookieClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (signInError || !data.user || !data.session) {
    return error("Those details do not match a school account.", 401);
  }

  let profile: { id: string; name: string; role: string; tenantId: string | null } | null = null;
  let tenant: { id: string; slug: string; name: string; status: string; email?: string | null } | null = null;

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
      .select("id, slug, name, status, email")
      .eq("slug", slug)
      .maybeSingle();
    tenant = school;
    if (!tenant || tenant.status === "suspended") {
      await supabase.auth.signOut();
      return error("Those details do not match a school account.", 401);
    }
    if (tenant.status === "pending") {
      await supabase.auth.signOut();
      return error("This dugsi is waiting for OurDugsi to approve it.", 403);
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
    if (parsed.data.portal === "parent" && profile.role !== "PARENT") {
      await supabase.auth.signOut();
      return error("This page is for parents. Use Teacher or Admin on the school page.");
    }
    if (parsed.data.portal === "staff" && profile.role === "PARENT") {
      await supabase.auth.signOut();
      return error("This page is for the office and teachers. Use Parent sign in.");
    }
    if (parsed.data.portal === "teacher" && profile.role !== "TEACHER") {
      await supabase.auth.signOut();
      return error("This page is for teachers. Admin uses Admin on the school page.");
    }
    if (parsed.data.portal === "admin" && profile.role !== "ADMIN" && profile.role !== "STAFF") {
      await supabase.auth.signOut();
      return error("This page is for the school office. Teachers and parents use the school page.");
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
  const user = publicUser({
    userId: data.user.id,
    email,
    name: profile.name,
    role: profile.role as Role,
    tenantId: profile.tenantId,
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
  });

  const wantsAdminCode = parsed.data.portal === "admin" || slug === "platform";
  if (wantsAdminCode && isAdminLoginRole(profile.role)) {
    const dest = await adminCodeDestination(admin, {
      userId: profile.id,
      authEmail: email,
      tenantEmail: tenant?.email ?? null,
    });
    const response = json({
      needsCode: true,
      needsEmail: !dest,
      sentTo: dest ? maskEmail(dest) : null,
    });
    if (dest) {
      await sendAdminLoginCode({
        response,
        userId: profile.id,
        dest,
        name: profile.name,
        schoolName: tenant?.name ?? "OurDugsi",
        tenantId: profile.tenantId,
      });
    } else {
      attachAdminOtpCookies(response, {
        userId: profile.id,
        dest: "",
        hash: "",
        exp: Date.now() + 10 * 60 * 1000,
        tries: 0,
        sentAt: 0,
      });
    }
    return response;
  }

  const response = json({ token: accessToken, user });
  clearAdminOtpCookies(response);
  return response;
}

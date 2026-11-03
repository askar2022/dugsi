import { applyCors, error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { sendPlainEmail, sendTenantEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-messages";
import { getAppUrl } from "@/lib/env";
import { isDeliverableEmail, resetEmailDestination, resolveSchoolLoginEmail } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgotPasswordSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

async function sendResetLink(input: {
  authEmail: string;
  dest: string;
  name?: string | null;
  schoolName: string;
  tenantId?: string | null;
}) {
  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: input.authEmail,
    options: { redirectTo: `${getAppUrl()}/reset` },
  });
  if (linkError) {
    return error("Could not start a password reset.");
  }
  const resetLink = linkData?.properties?.action_link;
  if (!resetLink) {
    return error("Could not start a password reset.");
  }

  const copy = passwordResetEmail({
    schoolName: input.schoolName,
    name: input.name,
    resetLink,
  });
  if (input.tenantId) {
    await sendTenantEmail({
      tenantId: input.tenantId,
      toEmail: input.dest,
      subject: copy.subject,
      body: copy.body,
      event: "password_reset",
    });
  } else {
    await sendPlainEmail({ toEmail: input.dest, subject: copy.subject, body: copy.body });
  }
  return json({ ok: true, emailed: true, message: "Check your email for a reset link." });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter your username.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const username = parsed.data.username.trim().toLowerCase();
  const admin = createAdminClient();

  if (slug === "platform") {
    const first = await admin
      .from("User")
      .select("id, name, email, securityEmail, role")
      .eq("role", "PLATFORM");
    const user = (first.data ?? []).find((row) => {
      const email = String(row.email ?? "").toLowerCase();
      const security = "securityEmail" in row ? String(row.securityEmail ?? "").toLowerCase() : "";
      return email === username || security === username;
    });
    const dest = resetEmailDestination(user) || (user && isDeliverableEmail(user.email) ? user.email : null);
    if (!user || !dest) {
      return json({
        ok: true,
        emailed: false,
        message: "If this super admin login can receive email, a reset link was sent.",
      });
    }
    return sendResetLink({
      authEmail: user.email,
      dest,
      name: user.name,
      schoolName: "OurDugsi",
    });
  }

  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, slug, name, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant || tenant.status !== "active") {
    return json({ ok: true, emailed: false, message: "If this login can receive email, a reset link was sent." });
  }

  const email = await resolveSchoolLoginEmail({
    tenantId: tenant.id,
    schoolCode: tenant.slug,
    username: parsed.data.username,
  });
  const lookup = await admin
    .from("User")
    .select("id, name, email, securityEmail")
    .eq("tenantId", tenant.id)
    .eq("email", email)
    .maybeSingle();
  const user =
    lookup.data ??
    (
      await admin
        .from("User")
        .select("id, name, email")
        .eq("tenantId", tenant.id)
        .eq("email", email)
        .maybeSingle()
    ).data;
  const dest = resetEmailDestination(user);
  if (!user || !dest) {
    return json({
      ok: true,
      emailed: false,
      message: "Add an email on the Password page after you sign in, or ask the office to reset this password.",
    });
  }

  return sendResetLink({
    authEmail: user.email,
    dest,
    name: user.name,
    schoolName: tenant.name,
    tenantId: tenant.id,
  });
}

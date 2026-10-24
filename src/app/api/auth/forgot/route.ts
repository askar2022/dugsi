import { applyCors, error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { sendTenantEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-messages";
import { getAppUrl } from "@/lib/env";
import { isDeliverableEmail, resolveSchoolLoginEmail } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgotPasswordSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter your school code and username.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, slug, name, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant || tenant.status !== "active") {
    return json({ ok: true, emailed: false });
  }

  const email = await resolveSchoolLoginEmail({
    tenantId: tenant.id,
    schoolCode: tenant.slug,
    username: parsed.data.username,
  });
  const { data: user } = await admin
    .from("User")
    .select("id, name, email")
    .eq("tenantId", tenant.id)
    .eq("email", email)
    .maybeSingle();
  if (!user || !isDeliverableEmail(user.email)) {
    return json({
      ok: true,
      emailed: false,
      message: "Ask the office or super admin to reset this password.",
    });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
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
    schoolName: tenant.name,
    name: user.name,
    resetLink,
  });
  await sendTenantEmail({
    tenantId: tenant.id,
    toEmail: user.email,
    subject: copy.subject,
    body: copy.body,
    event: "password_reset",
  });

  return json({ ok: true, emailed: true, message: "Check your email for a reset link." });
}

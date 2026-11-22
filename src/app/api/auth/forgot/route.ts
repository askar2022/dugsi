import { applyCors, error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { assertEmailDelivered, sendPlainEmail, sendTenantEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-messages";
import { getAppUrl } from "@/lib/env";
import { parentUsernameLabel, primaryMailDestination, resolveSchoolLoginEmail } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgotPasswordSchema } from "@/lib/validators";

function rolesForPortal(portal?: "parent" | "staff" | "admin" | "teacher") {
  if (portal === "parent") return ["PARENT"];
  if (portal === "teacher" || portal === "staff") return ["TEACHER"];
  if (portal === "admin") return ["ADMIN", "STAFF"];
  return null;
}

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
  try {
    const delivery = input.tenantId
      ? await sendTenantEmail({
          tenantId: input.tenantId,
          toEmail: input.dest,
          subject: copy.subject,
          body: copy.body,
          html: copy.html,
          event: "password_reset",
        })
      : await sendPlainEmail({
          toEmail: input.dest,
          subject: copy.subject,
          body: copy.body,
          html: copy.html,
        });
    assertEmailDelivered(delivery);
  } catch {
    return error("Could not email that reset. Check Spam on the email registered for this login.");
  }
  return json({
    ok: true,
    emailed: true,
    message: "Check Inbox and Spam on the email registered for this login.",
  });
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
    const user =
      (first.data ?? []).find((row) => {
        const email = String(row.email ?? "").toLowerCase();
        const security = "securityEmail" in row ? String(row.securityEmail ?? "").toLowerCase() : "";
        return email === username || security === username;
      }) ?? null;
    const dest = primaryMailDestination(user);
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

  const loginEmail = await resolveSchoolLoginEmail({
    tenantId: tenant.id,
    schoolCode: tenant.slug,
    username: parsed.data.username,
  });
  const first = await admin
    .from("User")
    .select("id, name, email, securityEmail, role")
    .eq("tenantId", tenant.id);
  const roles = rolesForPortal(parsed.data.portal);
  const candidates = (first.data ?? []).filter((row) => !roles || roles.includes(row.role));
  const user =
    candidates.find((row) => String(row.email ?? "").toLowerCase() === loginEmail.toLowerCase()) ??
    candidates.find((row) => {
      const email = String(row.email ?? "").toLowerCase();
      const security = "securityEmail" in row ? String(row.securityEmail ?? "").toLowerCase() : "";
      const label = parentUsernameLabel(email, tenant.slug).toLowerCase();
      return email === username || security === username || label === username;
    }) ??
    null;
  const dest = primaryMailDestination(user);
  if (!user || !dest) {
    return json({
      ok: true,
      emailed: false,
      message: "If this login has a registered email, a reset was sent there.",
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

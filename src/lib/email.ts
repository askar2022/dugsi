import { createAdminClient } from "@/lib/supabase/admin";

export type EmailEvent =
  | "student_enrolled"
  | "parent_welcome"
  | "invoice_created"
  | "invoice_paid"
  | "invoice_late"
  | "staff_onboarded"
  | "homework_assigned"
  | "homework_reminder"
  | "progress_contact"
  | "friday_parent"
  | "friday_teacher"
  | "friday_admin"
  | "friday_admin_month"
  | "password_reset"
  | "admin_login_code";

function fromAddress() {
  const raw = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "fariin@ourdugsi.com";
  return raw.includes("<") ? raw : `Dugsi <${raw}>`;
}

async function deliverWithResend(input: { toEmail: string; subject: string; body: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "logged" as const, error: null };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.toEmail],
      subject: input.subject,
      text: input.body,
      ...(input.html ? { html: input.html } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[email] Resend did not accept the message.");
    return { status: "failed" as const, error: detail.slice(0, 300) };
  }

  return { status: "sent" as const, error: null };
}

export type EmailDelivery = { status: "sent" | "failed" | "logged"; error: string | null };

export function assertEmailDelivered(delivery: EmailDelivery) {
  if (delivery.status === "sent") return;
  if (delivery.status === "logged" && process.env.APP_ENV !== "production") return;
  throw new Error("Could not email that. Use Gmail or another inbox you can open, then check Spam.");
}

export async function sendPlainEmail(input: { toEmail: string; subject: string; body: string; html?: string }) {
  return deliverWithResend(input);
}

export async function sendTenantEmail(input: {
  tenantId: string;
  toEmail: string;
  subject: string;
  body: string;
  html?: string;
  event: EmailEvent;
}) {
  const delivery = await deliverWithResend(input);
  const admin = createAdminClient();
  const { data: log } = await admin
    .from("EmailLog")
    .insert({
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      event: input.event,
      status: delivery.status,
    })
    .select("*")
    .single();

  console.info(`[email:${input.event}] ${delivery.status} for ${input.toEmail}: ${input.subject}`);
  return { ...delivery, log };
}

import { createAdminClient } from "@/lib/supabase/admin";

type EmailEvent =
  | "student_enrolled"
  | "invoice_created"
  | "invoice_paid"
  | "invoice_late"
  | "staff_onboarded";

export async function sendTenantEmail(input: {
  tenantId: string;
  toEmail: string;
  subject: string;
  body: string;
  event: EmailEvent;
}) {
  const status = process.env.RESEND_API_KEY ? "queued" : "logged";
  const admin = createAdminClient();
  const { data: log } = await admin
    .from("EmailLog")
    .insert({
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      event: input.event,
      status,
    })
    .select("*")
    .single();

  console.info(`[email:${input.event}] ${status} for ${input.toEmail}: ${input.subject}`);
  return log;
}

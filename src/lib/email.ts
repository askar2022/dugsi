import { prisma } from "./prisma";

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

  const log = await prisma.emailLog.create({
    data: {
      tenantId: input.tenantId,
      toEmail: input.toEmail,
      subject: input.subject,
      body: input.body,
      event: input.event,
      status,
    },
  });

  if (process.env.RESEND_API_KEY) {
    // Real provider wiring comes later. Staging/production can set RESEND_API_KEY.
    console.info(`[email:${input.event}] queued to ${input.toEmail}`);
  } else {
    console.info(`[email:${input.event}] logged for ${input.toEmail}: ${input.subject}`);
  }

  return log;
}

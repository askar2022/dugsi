import { adminLoginCodeEmail } from "@/lib/email-messages";
import { sendPlainEmail } from "@/lib/email";
import {
  attachAdminOtpCookies,
  createAdminCode,
  hashAdminCode,
  type AdminOtpPayload,
} from "@/lib/admin-otp";
import { NextResponse } from "next/server";

export async function sendAdminLoginCode(input: {
  response: NextResponse;
  userId: string;
  dest: string;
  name?: string | null;
  schoolName: string;
  tenantId?: string | null;
  tries?: number;
}) {
  const code = createAdminCode();
  const copy = adminLoginCodeEmail({
    schoolName: input.schoolName,
    name: input.name,
    code,
  });
  await sendPlainEmail({ toEmail: input.dest, subject: copy.subject, body: copy.body });

  const payload: AdminOtpPayload = {
    userId: input.userId,
    dest: input.dest,
    hash: hashAdminCode(code, input.userId),
    exp: Date.now() + 10 * 60 * 1000,
    tries: input.tries ?? 0,
    sentAt: Date.now(),
  };
  attachAdminOtpCookies(input.response, payload);
  return payload;
}

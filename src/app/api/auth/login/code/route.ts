import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { applyCors, error, json } from "@/lib/http";
import {
  ADMIN_OTP_DATA,
  adminCodeDestination,
  attachAdminOtpCookies,
  codesMatch,
  isAdminLoginRole,
  markAdminOtpOk,
  maskEmail,
  readOtpPayload,
  saveAdminSecurityEmail,
} from "@/lib/admin-otp";
import { sendAdminLoginCode } from "@/lib/admin-otp-send";
import { isDeliverableEmail } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient, publicUser } from "@/lib/supabase/request";
import { adminCodeSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = adminCodeSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter the 6-digit code we sent.");
  }

  let session;
  try {
    ({ session } = await getAuthedClient(request));
  } catch {
    return error("Sign in with your password first.", 401);
  }
  if (!isAdminLoginRole(session.role)) {
    return error("This extra code is only for admin.");
  }

  const jar = await cookies();
  const payload = readOtpPayload(jar.get(ADMIN_OTP_DATA)?.value);
  if (!payload || payload.userId !== session.userId) {
    return error("Ask for a new 6-digit code.");
  }

  const admin = createAdminClient();

  if (parsed.data.email || parsed.data.resend || !payload.hash) {
    if (payload.sentAt && Date.now() - payload.sentAt < 45_000 && payload.hash) {
      return error("Wait a moment, then ask for a new code.");
    }
    let dest = parsed.data.email?.trim().toLowerCase() || payload.dest;
    if (parsed.data.email) {
      dest = await saveAdminSecurityEmail(admin, session.userId, parsed.data.email);
    }
    if (!dest || !isDeliverableEmail(dest)) {
      dest = await adminCodeDestination(admin, {
        userId: session.userId,
        authEmail: session.email,
      });
    }
    if (!dest) {
      return error("Enter the email where we should send your 6-digit code.");
    }
    const response = json({
      needsCode: true,
      needsEmail: false,
      sentTo: maskEmail(dest),
    });
    await sendAdminLoginCode({
      response,
      userId: session.userId,
      dest,
      name: session.name,
      schoolName: session.tenantName ?? "OurDugsi",
      tenantId: session.tenantId,
      tries: payload.tries,
    });
    return response;
  }

  const code = parsed.data.code ?? "";
  if (!codesMatch(code, session.userId, payload.hash)) {
    const tries = payload.tries + 1;
    if (tries >= 5) {
      const response = error("Too many tries. Sign in with your password again.");
      const { createCookieClient } = await import("@/lib/supabase/request");
      const supabase = await createCookieClient();
      await supabase.auth.signOut();
      const { clearAdminOtpCookies } = await import("@/lib/admin-otp");
      clearAdminOtpCookies(response);
      return response;
    }
    const response = error("That code is not correct.");
    attachAdminOtpCookies(response, { ...payload, tries });
    return response;
  }

  const response = json({
    ok: true,
    user: publicUser(session),
  });
  markAdminOtpOk(response);
  return response;
}

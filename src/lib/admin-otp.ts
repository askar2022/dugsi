import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { isDeliverableEmail } from "@/lib/parent-account";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/config";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_OTP_COOKIE = "dugsi_admin_otp";
export const ADMIN_OTP_DATA = "dugsi_admin_otp_data";

export type AdminOtpPayload = {
  userId: string;
  dest: string;
  hash: string;
  exp: number;
  tries: number;
  sentAt: number;
};

function secret() {
  return getSupabaseServiceRoleKey();
}

export function isAdminLoginRole(role?: string | null) {
  return role === "ADMIN" || role === "STAFF" || role === "PLATFORM";
}

export function createAdminCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashAdminCode(code: string, userId: string) {
  return createHmac("sha256", secret()).update(`${userId}:${code}`).digest("hex");
}

export function codesMatch(code: string, userId: string, hash: string) {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6 || !hash) return false;
  const next = hashAdminCode(clean, userId);
  try {
    return timingSafeEqual(Buffer.from(next), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function signOtpPayload(payload: AdminOtpPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOtpPayload(raw?: string | null): AdminOtpPayload | null {
  if (!raw || !raw.includes(".")) return null;
  const [body, sig] = raw.split(".");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as AdminOtpPayload;
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain || !name) return "your email";
  return `${name.slice(0, 1)}***@${domain}`;
}

export function otpCookieOptions(maxAge = 10 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function attachAdminOtpCookies(response: NextResponse, payload: AdminOtpPayload) {
  const options = otpCookieOptions();
  response.cookies.set(ADMIN_OTP_COOKIE, "pending", options);
  response.cookies.set(ADMIN_OTP_DATA, signOtpPayload(payload), options);
  return response;
}

export function markAdminOtpOk(response: NextResponse) {
  const options = otpCookieOptions(60 * 60 * 12);
  response.cookies.set(ADMIN_OTP_COOKIE, "ok", options);
  response.cookies.set(ADMIN_OTP_DATA, "", { ...options, maxAge: 0 });
  return response;
}

export function clearAdminOtpCookies(response: NextResponse) {
  const options = otpCookieOptions(0);
  response.cookies.set(ADMIN_OTP_COOKIE, "", options);
  response.cookies.set(ADMIN_OTP_DATA, "", options);
  return response;
}

export async function adminCodeDestination(
  admin: SupabaseClient,
  input: { userId: string; authEmail: string; tenantEmail?: string | null },
) {
  const first = await admin
    .from("User")
    .select("email, securityEmail")
    .eq("id", input.userId)
    .maybeSingle();
  const user =
    first.data ??
    (await admin.from("User").select("email").eq("id", input.userId).maybeSingle()).data;
  const securityEmail = user && "securityEmail" in user ? String(user.securityEmail ?? "") : "";
  if (securityEmail && isDeliverableEmail(securityEmail)) return securityEmail;
  if (input.authEmail && isDeliverableEmail(input.authEmail)) return input.authEmail;
  if (user?.email && isDeliverableEmail(user.email)) return user.email;
  if (input.tenantEmail && isDeliverableEmail(input.tenantEmail)) return input.tenantEmail;
  return null;
}

export async function saveAdminSecurityEmail(admin: SupabaseClient, userId: string, email: string) {
  const value = email.trim().toLowerCase();
  if (!isDeliverableEmail(value)) {
    throw new Error("Enter a real email so we can send the 6-digit code.");
  }
  const { error } = await admin.from("User").update({ securityEmail: value }).eq("id", userId);
  if (error && !/securityEmail|column/i.test(error.message)) {
    throw new Error(error.message);
  }
  return value;
}

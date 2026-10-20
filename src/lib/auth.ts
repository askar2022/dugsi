import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getAppEnv, getAuthSecret, isProduction } from "./env";
import { prisma } from "./prisma";
import type { Role, Session } from "./types";

export const SESSION_COOKIE = "dugsi_session";
const TOKEN_DAYS = 7;

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(session: Session) {
  return new SignJWT({
    email: session.email,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId ?? "",
    tenantSlug: session.tenantSlug ?? "",
    tenantName: session.tenantName ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      userId: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      tenantId: payload.tenantId ? String(payload.tenantId) : null,
      tenantSlug: payload.tenantSlug ? String(payload.tenantSlug) : null,
      tenantName: payload.tenantName ? String(payload.tenantName) : null,
    };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: TOKEN_DAYS * 24 * 60 * 60,
  };
}

export function readTokenFromRequest(request: NextRequest | Request) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  if (request instanceof NextRequest) {
    return request.cookies.get(SESSION_COOKIE)?.value ?? null;
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function getSessionFromRequest(request: NextRequest | Request) {
  const token = readTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function authenticateUser(input: {
  schoolCode: string;
  email: string;
  password: string;
}) {
  const slug = normalizeSchoolCode(input.schoolCode);
  const email = input.email.trim().toLowerCase();

  if (slug === "platform") {
    const user = await prisma.user.findFirst({
      where: { email, role: "PLATFORM", tenantId: null },
    });
    if (!user || user.status !== "active") return null;
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) return null;
    return toSession(user, null);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status === "suspended") return null;

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email },
  });
  if (!user || user.status !== "active") return null;
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return null;
  return toSession(user, tenant);
}

export function toSession(
  user: { id: string; email: string; name: string; role: string; tenantId: string | null },
  tenant: { id: string; slug: string; name: string } | null,
): Session {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: tenant?.id ?? user.tenantId,
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
  };
}

export function normalizeSchoolCode(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function publicUser(session: Session) {
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    tenantName: session.tenantName,
    env: getAppEnv(),
  };
}

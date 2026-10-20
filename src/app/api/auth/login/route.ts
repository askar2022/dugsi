import { cookies } from "next/headers";
import { authenticateUser, cookieOptions, createSessionToken, publicUser, SESSION_COOKIE } from "@/lib/auth";
import { applyCors, error, json } from "@/lib/http";
import { loginSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter your school code, email, and password.");
  }

  const session = await authenticateUser(parsed.data);
  if (!session) {
    return error("Those details do not match a school account.", 401);
  }

  const token = await createSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions());

  return json({ token, user: publicUser(session) });
}

import { NextRequest } from "next/server";
import { getSessionFromRequest, publicUser } from "@/lib/auth";
import { applyCors, error, json } from "@/lib/http";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return error("Sign in required.", 401);
  }
  return json({ user: publicUser(session) });
}

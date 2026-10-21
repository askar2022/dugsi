import { NextRequest } from "next/server";
import { applyCors, error, json } from "@/lib/http";
import { getAuthedClient, publicUser } from "@/lib/supabase/request";
import { ApiError } from "@/lib/errors";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await getAuthedClient(request);
    return json({ user: publicUser(session) });
  } catch (err) {
    if (err instanceof ApiError) return error(err.message, err.status);
    return error("Sign in required.", 401);
  }
}

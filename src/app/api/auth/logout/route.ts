import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { applyCors, json } from "@/lib/http";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return json({ ok: true });
}

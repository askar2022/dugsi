import { applyCors, json } from "@/lib/http";
import { createCookieClient } from "@/lib/supabase/request";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST() {
  const supabase = await createCookieClient();
  await supabase.auth.signOut();
  return json({ ok: true });
}

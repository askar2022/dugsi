import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient, publicUser } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  try {
    const { session } = await getAuthedClient(request);
    const admin = createAdminClient();
    await admin.from("User").update({ status: "active" }).eq("id", session.userId);
    return json({ user: publicUser(session) });
  } catch (err) {
    return handleApiError(err);
  }
}

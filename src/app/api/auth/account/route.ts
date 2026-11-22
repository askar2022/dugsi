import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { resetEmailDestination } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { session } = await getAuthedClient(request);
    const admin = createAdminClient();
    const { data: user } = await admin
      .from("User")
      .select("email, securityEmail")
      .eq("id", session.userId)
      .maybeSingle();
    return json({
      email: resetEmailDestination(user) ?? "",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH() {
  return handleApiError(new ApiError("Password reset stays on the email registered for this login.", 403));
}

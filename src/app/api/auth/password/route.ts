import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { passwordMatches } from "@/lib/parent-account";
import { getAuthedClient } from "@/lib/supabase/request";
import { changePasswordSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, session } = await getAuthedClient(request);
    const parsed = changePasswordSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ApiError("Enter your current password and a new password.");
    }
    if (parsed.data.currentPassword === parsed.data.password) {
      throw new ApiError("Choose a new password.");
    }
    const matches = await passwordMatches(session.email, parsed.data.currentPassword);
    if (!matches) {
      throw new ApiError("Your current password is not correct.");
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      throw new ApiError(error.message || "Could not save the new password.");
    }
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

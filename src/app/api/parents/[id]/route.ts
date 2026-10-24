import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { setLoginPassword } from "@/lib/parent-account";
import { requireAuthedTenant } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.password !== "string") {
      throw new ApiError("Enter a new password for this parent.");
    }

    const { data: parent } = await supabase
      .from("User")
      .select("id, role")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .eq("role", "PARENT")
      .maybeSingle();
    if (!parent) {
      throw new ApiError("Parent not found.", 404);
    }

    await setLoginPassword(parent.id, body.password);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

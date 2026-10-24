import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { setLoginPassword } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session } = await getAuthedClient(request);
    if (session.role !== "PLATFORM") {
      throw new ApiError("Only the super admin can approve a dugsi.", 403);
    }
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    if (typeof body.adminPassword === "string" && body.adminUserId) {
      const { data: user } = await admin
        .from("User")
        .select("id, role, tenantId")
        .eq("id", body.adminUserId)
        .eq("tenantId", id)
        .maybeSingle();
      if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
        throw new ApiError("Admin login not found.");
      }
      await setLoginPassword(user.id, body.adminPassword);
      return json({ ok: true });
    }

    const status = body.status === "suspended" ? "suspended" : body.status === "pending" ? "pending" : "active";
    const { data: tenant, error } = await admin
      .from("Tenant")
      .update({ status })
      .eq("id", id)
      .select("id, name, slug, status")
      .single();
    if (error || !tenant) {
      throw new ApiError(error?.message || "Could not update that dugsi.");
    }
    return json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}

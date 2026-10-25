import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { ensureSchoolLogin, setLoginPassword } from "@/lib/parent-account";
import { portalForPosition } from "@/lib/staff-positions";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const { data: staff, error } = await supabase
      .from("Staff")
      .select("*")
      .eq("id", id)
      .single();
    throwIfError(error, "Staff member not found.");

    if (body.status === "active" || body.status === "inactive") {
      const { error: staffError } = await supabase
        .from("Staff")
        .update({ status: body.status })
        .eq("id", id);
      throwIfError(staffError, "Could not update that staff status.");
      if (staff.userId) {
        const { error: userError } = await supabase
          .from("User")
          .update({ status: body.status })
          .eq("id", staff.userId)
          .eq("tenantId", session.tenantId);
        throwIfError(userError, "Could not update that login.");
      }
      return json({ ok: true });
    }

    if (typeof body.password === "string" && staff.userId) {
      await setLoginPassword(staff.userId, body.password);
      return json({ ok: true });
    }

    const role = portalForPosition(staff.title);
    if (!role) {
      throw new ApiError("That position does not get a portal login.");
    }
    if (!session.tenantSlug) {
      throw new ApiError("This school is missing a school code.");
    }
    const username = String(body.username || staff.email || "").trim();
    const password = String(body.password || "").trim();
    if (username.length < 3 || password.length < 8) {
      throw new ApiError("Enter a username and password for this staff login.");
    }

    const created = await ensureSchoolLogin({
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      tenantName: session.tenantName,
      name: staff.name,
      username,
      password,
      phone: staff.phone,
      role,
      requirePassword: true,
    });

    const { data: updated, error: updateError } = await supabase
      .from("Staff")
      .update({ userId: created.userId, email: created.email })
      .eq("id", id)
      .select("*, user:User!userId(id, email, role, status)")
      .single();
    throwIfError(updateError, "Could not attach the login.");

    return json({ staff: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

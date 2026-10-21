import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { teacherWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const role = body.role === "ADMIN" || body.role === "STAFF" ? body.role : "TEACHER";

    const { data: staff, error } = await supabase
      .from("Staff")
      .select("*")
      .eq("id", id)
      .single();
    throwIfError(error, "Staff member not found.");
    if (!staff.email) {
      throw new ApiError("Add an email before sending a login invitation.");
    }
    if (staff.userId) {
      throw new ApiError("This staff member already has a login.");
    }

    const invited = await inviteSchoolUser({
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      tenantName: session.tenantName,
      email: String(staff.email),
      name: staff.name,
      role,
      phone: staff.phone,
    });

    const { data: updated, error: updateError } = await supabase
      .from("Staff")
      .update({ userId: invited.userId })
      .eq("id", id)
      .select("*, user:User!userId(id, email, role, status)")
      .single();
    throwIfError(updateError, "Could not attach the login.");

    const copy = teacherWelcomeEmail({
      schoolName: session.tenantName ?? "your school",
      teacherName: staff.name,
      title: staff.title,
      inviteLink: invited.inviteLink,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: String(staff.email).trim().toLowerCase(),
      subject: copy.subject,
      body: copy.body,
      event: "staff_onboarded",
    });

    return json({ staff: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

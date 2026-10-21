import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { teacherWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");
    const role = body.role === "ADMIN" || body.role === "STAFF" ? body.role : "TEACHER";

    const { data: staff, error } = await supabase
      .from("Staff")
      .select("*")
      .eq("id", id)
      .single();
    throwIfError(error, "Staff member not found.");
    if (!staff.email) {
      throw new ApiError("Add an email before creating a login.");
    }
    if (password.length < 8) {
      throw new ApiError("Enter a temporary password with at least 8 characters.");
    }
    if (staff.userId) {
      throw new ApiError("This staff member already has a login.");
    }

    const email = String(staff.email).trim().toLowerCase();
    const admin = createAdminClient();
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: staff.name },
      app_metadata: {
        role,
        tenant_id: session.tenantId,
        tenant_slug: session.tenantSlug,
        tenant_name: session.tenantName,
      },
    });
    throwIfError(authError, "Could not create that login.");
    if (!created.user) {
      throw new ApiError("Could not create that login.");
    }

    const { error: profileError } = await admin.from("User").insert({
      id: created.user.id,
      tenantId: session.tenantId,
      email,
      name: staff.name,
      phone: staff.phone,
      role,
      status: "active",
    });
    throwIfError(profileError, "Could not save the login.");

    const { data: updated, error: updateError } = await supabase
      .from("Staff")
      .update({ userId: created.user.id })
      .eq("id", id)
      .select("*, user:User!userId(id, email, role, status)")
      .single();
    throwIfError(updateError, "Could not attach the login.");

    const copy = teacherWelcomeEmail({
      schoolName: session.tenantName ?? "your school",
      teacherName: staff.name,
      title: staff.title,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: email,
      subject: copy.subject,
      body: copy.body,
      event: "staff_onboarded",
    });

    return json({ staff: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

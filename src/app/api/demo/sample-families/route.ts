import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { getAppEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  try {
    if (getAppEnv() === "production") {
      throw new ApiError("Sample families can only be added on staging.", 403);
    }
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const { data: existing, error: existingError } = await supabase.from("Student").select("id").limit(1);
    throwIfError(existingError, "Could not check students.");
    if (existing && existing.length > 0) {
      return json({ ok: true, created: false });
    }

    const admin = createAdminClient();
    const parentEmail = `parent@${session.tenantSlug}.dugsi`;
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: parentEmail,
      password: "Dugsi123!",
      email_confirm: true,
      user_metadata: { name: "Amina Hassan" },
      app_metadata: {
        role: "PARENT",
        tenant_id: session.tenantId,
        tenant_slug: session.tenantSlug,
        tenant_name: session.tenantName,
      },
    });
    throwIfError(authError, "Could not create the sample parent login.");
    if (!created.user) {
      throw new ApiError("Could not create the sample parent login.");
    }

    const { error: parentError } = await admin.from("User").insert({
      id: created.user.id,
      tenantId: session.tenantId,
      email: parentEmail,
      name: "Amina Hassan",
      role: "PARENT",
      status: "active",
    });
    throwIfError(parentError, "Could not save the sample parent.");

    const { error: studentError } = await supabase.from("Student").insert([
      {
        tenantId: session.tenantId,
        firstName: "Aisha",
        lastName: "Hassan",
        gender: "girl",
        parentId: created.user.id,
        status: "enrolled",
      },
      {
        tenantId: session.tenantId,
        firstName: "Omar",
        lastName: "Hassan",
        gender: "boy",
        parentId: created.user.id,
        status: "enrolled",
      },
    ]);
    throwIfError(studentError, "Could not save sample students.");

    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: parentEmail,
      subject: `Parent login for ${session.tenantName}`,
      body: `Sign in with school code ${session.tenantSlug}, email ${parentEmail}, and password Dugsi123!.`,
      event: "student_enrolled",
    });

    return json({ ok: true, created: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

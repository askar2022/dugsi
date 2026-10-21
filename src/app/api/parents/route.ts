import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { parentWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { parentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { data: parents, error } = await supabase
      .from("User")
      .select("id, name, email, phone, status, children:Student!parentId(id, firstName, lastName, status)")
      .eq("tenantId", session.tenantId)
      .eq("role", "PARENT")
      .order("name");
    throwIfError(error, "Could not load parents.");
    return json({ parents: parents ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = parentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the parent's name and email.");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password || "Dugsi123!";
    const admin = createAdminClient();
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name },
      app_metadata: {
        role: "PARENT",
        tenant_id: session.tenantId,
        tenant_slug: session.tenantSlug,
        tenant_name: session.tenantName,
      },
    });
    throwIfError(authError, "Could not create the parent login.");
    if (!created.user) {
      throw new ApiError("Could not create the parent login.");
    }

    const { data: parent, error } = await admin
      .from("User")
      .insert({
        id: created.user.id,
        tenantId: session.tenantId,
        email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        role: "PARENT",
        status: "active",
      })
      .select("id, name, email, phone, status")
      .single();
    throwIfError(error, "Could not save the parent.");

    const copy = parentWelcomeEmail({
      schoolName: session.tenantName ?? "your school",
      parentName: parsed.data.name,
      email,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: email,
      subject: copy.subject,
      body: copy.body,
      event: "parent_welcome",
    });

    return json({ parent }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

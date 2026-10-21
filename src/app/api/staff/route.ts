import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { teacherWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { staffSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { data: staff, error } = await supabase
      .from("Staff")
      .select("*, user:User!userId(id, email, role, status)")
      .order("name");
    throwIfError(error, "Could not load staff.");
    const { data: teachers } = await supabase
      .from("User")
      .select("id, name, email, phone")
      .eq("tenantId", session.tenantId)
      .eq("role", "TEACHER");
    return json({ staff: staff ?? [], teachers: teachers ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the staff member's name and title.");
    }

    const email = parsed.data.email?.trim().toLowerCase() || null;
    let userId: string | undefined;
    if (parsed.data.createLogin && email && parsed.data.password) {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("User")
        .select("id, name, role, email")
        .eq("tenantId", session.tenantId)
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        throw new ApiError(
          `${email} already belongs to ${existing.name} (${existing.role}). Use a new email for this teacher, such as farah@${session.tenantSlug}.dugsi.`,
        );
      }
      const { data: created, error: authError } = await admin.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { name: parsed.data.name },
        app_metadata: {
          role: parsed.data.role ?? "TEACHER",
          tenant_id: session.tenantId,
          tenant_slug: session.tenantSlug,
          tenant_name: session.tenantName,
        },
      });
      if (authError) {
        const taken = /already|registered|exists/i.test(authError.message);
        throw new ApiError(
          taken
            ? `${email} is already used. Give Farah her own email, for example farah@${session.tenantSlug}.dugsi.`
            : authError.message || "Could not create that login.",
        );
      }
      if (created.user) {
        await admin.from("User").insert({
          id: created.user.id,
          tenantId: session.tenantId,
          email,
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          role: parsed.data.role ?? "TEACHER",
          status: "active",
        });
        userId = created.user.id;
      }
    }

    const writer = createAdminClient();
    const { data: staff, error } = await writer
      .from("Staff")
      .insert({
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name,
        email,
        phone: parsed.data.phone || null,
        title: parsed.data.title,
        startDate: parsed.data.startDate || null,
        salary: parsed.data.salary,
        notes: parsed.data.notes || null,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save the staff member.");

    if (email) {
      const copy = teacherWelcomeEmail({
        schoolName: session.tenantName ?? "your school",
        teacherName: parsed.data.name,
        title: parsed.data.title,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: email,
        subject: copy.subject,
        body: copy.body,
        event: "staff_onboarded",
      });
    }

    return json({ staff }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

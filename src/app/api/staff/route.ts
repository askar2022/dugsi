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

    let userId: string | undefined;
    if (parsed.data.createLogin && parsed.data.email && parsed.data.password) {
      const email = parsed.data.email.trim().toLowerCase();
      const admin = createAdminClient();
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
      throwIfError(authError, "Could not create that login.");
      if (created.user) {
        await admin.from("User").insert({
          id: created.user.id,
          tenantId: session.tenantId,
          email,
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: parsed.data.role ?? "TEACHER",
          status: "active",
        });
        userId = created.user.id;
      }
    }

    const { data: staff, error } = await supabase
      .from("Staff")
      .insert({
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        title: parsed.data.title,
        startDate: parsed.data.startDate,
        salary: parsed.data.salary,
        notes: parsed.data.notes,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save the staff member.");

    if (parsed.data.email) {
      const copy = teacherWelcomeEmail({
        schoolName: session.tenantName ?? "your school",
        teacherName: parsed.data.name,
        title: parsed.data.title,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parsed.data.email,
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

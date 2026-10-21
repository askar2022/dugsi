import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { studentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const { data: students, error } = await supabase
      .from("Student")
      .select("*, class:Class(*), parent:User!parentId(id, name, email, phone)")
      .order("lastName")
      .order("firstName");
    throwIfError(error, "Could not load students.");
    return json({ students: students ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = studentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the student's first and last name.");
    }

    let parentId: string | undefined;
    if (parsed.data.parentEmail) {
      const email = parsed.data.parentEmail.trim().toLowerCase();
      const { data: existing } = await supabase.from("User").select("id").eq("email", email).maybeSingle();
      if (existing) {
        parentId = existing.id;
      } else if (parsed.data.parentName && parsed.data.parentEmail) {
        const admin = createAdminClient();
        const { data: created, error: authError } = await admin.auth.admin.createUser({
          email,
          password: "Dugsi123!",
          email_confirm: true,
          user_metadata: { name: parsed.data.parentName },
          app_metadata: {
            role: "PARENT",
            tenant_id: session.tenantId,
            tenant_slug: session.tenantSlug,
            tenant_name: session.tenantName,
          },
        });
        throwIfError(authError, "Could not create the parent login.");
        if (created.user) {
          await admin.from("User").insert({
            id: created.user.id,
            tenantId: session.tenantId,
            email,
            name: parsed.data.parentName,
            phone: parsed.data.parentPhone,
            role: "PARENT",
            status: "active",
          });
          parentId = created.user.id;
        }
      }
    }

    const { data: student, error } = await supabase
      .from("Student")
      .insert({
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        parentId,
        classId: parsed.data.classId || null,
        notes: parsed.data.notes,
        status: parsed.data.status ?? "enrolled",
      })
      .select("*, parent:User!parentId(*), class:Class(*)")
      .single();
    throwIfError(error, "Could not register the student.");

    if (student?.parent?.email) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: student.parent.email,
        subject: `Registration received for ${student.firstName} ${student.lastName}`,
        body: `${student.firstName} has been registered at ${session.tenantName}.`,
        event: "student_enrolled",
      });
    }

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

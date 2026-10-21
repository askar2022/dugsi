import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentConfirmedEmail } from "@/lib/email-messages";
import { ApiError, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { studentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const assignedClassIds = await teacherAssignedClassIds(supabase, session);
    if (assignedClassIds && assignedClassIds.length === 0) {
      return json({ students: [] });
    }
    let query = supabase
      .from("Student")
      .select("*, class:Class(*), parent:User!parentId(id, name, email, phone)")
      .order("lastName")
      .order("firstName");
    if (assignedClassIds) query = query.in("classId", assignedClassIds);
    const { data: students, error } = await query;
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
      const { data: existing } = await supabase.from("User").select("id").eq("email", email).eq("tenantId", session.tenantId).maybeSingle();
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
    if (!parentId) {
      const parentEmail = `parent@${session.tenantSlug}.dugsi`;
      const { data: demoParent } = await supabase
        .from("User")
        .select("id")
        .eq("tenantId", session.tenantId)
        .eq("role", "PARENT")
        .eq("email", parentEmail)
        .maybeSingle();
      const { data: anyParent } = demoParent
        ? { data: demoParent }
        : await supabase
            .from("User")
            .select("id")
            .eq("tenantId", session.tenantId)
            .eq("role", "PARENT")
            .limit(1)
            .maybeSingle();
      parentId = (demoParent ?? anyParent)?.id;
    }

    const { data: student, error } = await supabase
      .from("Student")
      .insert({
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth || null,
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
      const copy = enrollmentConfirmedEmail({
        schoolName: session.tenantName ?? "your school",
        parentName: student.parent.name,
        childName: `${student.firstName} ${student.lastName}`,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: student.parent.email,
        subject: copy.subject,
        body: copy.body,
        event: "student_enrolled",
      });
    }

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

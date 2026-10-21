import { NextRequest } from "next/server";
import { isAssessmentClass } from "@/lib/assessment-class";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentConfirmedEmail } from "@/lib/email-messages";
import { ApiError, getTenantStudent, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { studentSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { student } = await getTenantStudent(request, id);
    return json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body.action === "unenroll") {
      const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "PARENT"]);
      const admin = createAdminClient();
      let query = admin
        .from("Student")
        .select("id, parentId, firstName, lastName, status")
        .eq("id", id)
        .eq("tenantId", session.tenantId);
      if (session.role === "PARENT") query = query.eq("parentId", session.userId);
      const { data: student, error: foundError } = await query.maybeSingle();
      throwIfError(foundError, "Could not find that child.");
      if (!student) throw new ApiError("You can only unenroll your own child.", 403);
      const { data: updated, error } = await admin
        .from("Student")
        .update({ status: "unenrolled", classId: null })
        .eq("id", id)
        .eq("tenantId", session.tenantId)
        .select("id, firstName, lastName, status")
        .single();
      throwIfError(error, "Could not unenroll that child.");
      return json({ student: updated });
    }

    if (body.action === "place") {
      const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
      const classId = typeof body.classId === "string" ? body.classId : "";
      if (!classId) throw new ApiError("Choose a class for this child.");
      const admin = createAdminClient();
      const { data: schoolClass } = await admin
        .from("Class")
        .select("id, name, level")
        .eq("id", classId)
        .eq("tenantId", session.tenantId)
        .maybeSingle();
      if (!schoolClass || isAssessmentClass(schoolClass)) {
        throw new ApiError("Choose a real class after the assessment.");
      }
      const { data: student, error } = await admin
        .from("Student")
        .update({ classId, status: "enrolled" })
        .eq("id", id)
        .eq("tenantId", session.tenantId)
        .select("id, firstName, lastName, status, parent:User!parentId(name, email)")
        .single();
      throwIfError(error, "Could not place that child in a class.");
      if (!student) throw new ApiError("Could not place that child in a class.");
      const { data: application } = await admin
        .from("EnrollmentApplication")
        .select("parentEmail, parentName")
        .eq("tenantId", session.tenantId)
        .eq("studentId", id)
        .maybeSingle();
      await admin
        .from("EnrollmentApplication")
        .update({ status: "enrolled" })
        .eq("tenantId", session.tenantId)
        .eq("studentId", id);
      const parent = Array.isArray(student?.parent) ? student.parent[0] : student?.parent;
      const parentEmail = (parent?.email ?? application?.parentEmail ?? "").trim().toLowerCase();
      if (parentEmail) {
        const copy = enrollmentConfirmedEmail({
          schoolName: session.tenantName ?? "your school",
          parentName: parent?.name ?? application?.parentName,
          childName: `${student.firstName} ${student.lastName}`,
          className: schoolClass.name,
        });
        await sendTenantEmail({
          tenantId: session.tenantId,
          toEmail: parentEmail,
          subject: copy.subject,
          body: copy.body,
          event: "student_enrolled",
        });
      }
      return json({ student });
    }

    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    await getTenantStudent(request, id);
    const parsed = studentSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new ApiError("Check the student details and try again.");
    }
    const { data: student, error } = await supabase
      .from("Student")
      .update({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        classId: parsed.data.classId,
        notes: parsed.data.notes,
        status: parsed.data.status,
      })
      .eq("id", id)
      .select("*, parent:User!parentId(name, email)")
      .single();
    throwIfError(error, "Could not update the student.");
    if (parsed.data.status === "enrolled" && student?.parent?.email) {
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
    return json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

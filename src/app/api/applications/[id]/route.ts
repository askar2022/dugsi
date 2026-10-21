import { NextRequest } from "next/server";
import { ensureAssessmentClass } from "@/lib/assessment-class";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentAcceptedEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

function guardianFromNotes(notes: string | null) {
  try {
    return notes ? JSON.parse(notes) as {
      guardianName?: string;
      guardianEmail?: string;
      guardianPhone?: string;
      address?: string;
      age?: number;
      notes?: string;
    } : {};
  } catch {
    return {};
  }
}

function guardianNotes(input: {
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  address: string | null;
  age: number | null;
  notes: string | null;
}) {
  return JSON.stringify({
    guardianName: input.parentName || undefined,
    guardianEmail: input.parentEmail || undefined,
    guardianPhone: input.parentPhone || undefined,
    address: input.address || undefined,
    age: input.age ?? undefined,
    notes: input.notes || undefined,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body.action === "decline" ? "decline" : "enroll";
    const admin = createAdminClient();

    const { data: application } = await admin
      .from("EnrollmentApplication")
      .select("*")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();

    const { data: studentRow } = application
      ? { data: null }
      : await admin
          .from("Student")
          .select("id, firstName, lastName, gender, notes, status, parentId, parent:User!parentId(name, email, phone)")
          .eq("id", id)
          .eq("tenantId", session.tenantId)
          .maybeSingle();

    if (!application && !studentRow) {
      throw new ApiError("Application not found.", 404);
    }

    const parent = Array.isArray(studentRow?.parent) ? studentRow.parent[0] : studentRow?.parent;
    const extra = guardianFromNotes(studentRow?.notes ?? null);
    const parentName = application?.parentName ?? extra.guardianName ?? parent?.name ?? "";
    const parentEmail = (application?.parentEmail ?? extra.guardianEmail ?? parent?.email ?? "").trim().toLowerCase();
    const parentPhone = application?.parentPhone ?? extra.guardianPhone ?? parent?.phone ?? null;
    const address = application?.address ?? extra.address ?? null;
    const age = application?.age ?? extra.age ?? null;
    const firstName = application?.firstName ?? studentRow?.firstName ?? "";
    const lastName = application?.lastName ?? studentRow?.lastName ?? "";
    const notes = extra.notes ?? (application?.notes && !application?.address ? application.notes : extra.notes) ?? null;

    if (action === "decline") {
      if (application) {
        await admin.from("EnrollmentApplication").update({ status: "declined" }).eq("id", id);
      } else {
        await admin.from("Student").update({ status: "declined" }).eq("id", id);
      }
      return json({ ok: true, status: "declined" });
    }

    let parentId = studentRow?.parentId ?? null;
    if (!parentId && parentEmail) {
      const { data: existing } = await admin
        .from("User")
        .select("id")
        .eq("tenantId", session.tenantId)
        .eq("role", "PARENT")
        .eq("email", parentEmail)
        .maybeSingle();
      parentId = existing?.id ?? null;
    }

    const holding = await ensureAssessmentClass(admin, session.tenantId);
    const storedNotes = guardianNotes({ parentName, parentEmail, parentPhone, address, age, notes });
    let studentId = application?.studentId ?? studentRow?.id ?? null;
    if (studentRow) {
      const { error } = await admin
        .from("Student")
        .update({
          parentId,
          classId: holding.id,
          status: "waiting_assessment",
          age,
          address,
          notes: storedNotes,
        })
        .eq("id", studentRow.id);
      throwIfError(error, "Could not accept that child.");
      studentId = studentRow.id;
    } else if (!studentId) {
      const { data: student, error } = await admin
        .from("Student")
        .insert({
          tenantId: session.tenantId,
          firstName,
          lastName,
          age,
          address,
          gender: application?.gender || null,
          notes: storedNotes,
          parentId,
          classId: holding.id,
          status: "waiting_assessment",
        })
        .select("id")
        .single();
      throwIfError(error, "Could not accept that child.");
      studentId = student?.id;
    } else {
      const { error } = await admin
        .from("Student")
        .update({
          parentId,
          classId: holding.id,
          status: "waiting_assessment",
          age,
          address,
          notes: storedNotes,
        })
        .eq("id", studentId);
      throwIfError(error, "Could not accept that child.");
    }

    if (application) {
      await admin
        .from("EnrollmentApplication")
        .update({ status: "accepted", studentId })
        .eq("id", id);
    }

    if (parentEmail) {
      const copy = enrollmentAcceptedEmail({
        schoolName: session.tenantName ?? "your school",
        parentName,
        childName: `${firstName} ${lastName}`,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: copy.subject,
        body: copy.body,
        event: "student_enrolled",
      });
    }

    return json({ ok: true, status: "waiting_assessment", studentId });
  } catch (err) {
    return handleApiError(err);
  }
}

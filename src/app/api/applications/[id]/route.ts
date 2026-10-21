import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentConfirmedEmail, parentWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

function guardianFromNotes(notes: string | null) {
  try {
    return notes ? JSON.parse(notes) as {
      guardianName?: string;
      guardianEmail?: string;
      guardianPhone?: string;
      notes?: string;
    } : {};
  } catch {
    return {};
  }
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
          .select("id, firstName, lastName, dateOfBirth, gender, notes, status, parentId, parent:User!parentId(name, email, phone)")
          .eq("id", id)
          .eq("tenantId", session.tenantId)
          .maybeSingle();

    if (!application && !studentRow) {
      throw new ApiError("Application not found.", 404);
    }

    const parent = Array.isArray(studentRow?.parent) ? studentRow.parent[0] : studentRow?.parent;
    const extra = guardianFromNotes(studentRow?.notes ?? null);
    const parentName = application?.parentName ?? extra.guardianName ?? parent?.name ?? "";
    const parentEmail = application?.parentEmail ?? extra.guardianEmail ?? parent?.email ?? "";
    const parentPhone = application?.parentPhone ?? extra.guardianPhone ?? parent?.phone ?? null;
    const firstName = application?.firstName ?? studentRow?.firstName ?? "";
    const lastName = application?.lastName ?? studentRow?.lastName ?? "";
    const notes = application?.notes ?? extra.notes ?? null;

    if (action === "decline") {
      if (application) {
        await admin.from("EnrollmentApplication").update({ status: "declined" }).eq("id", id);
      } else {
        await admin.from("Student").update({ status: "declined" }).eq("id", id);
      }
      return json({ ok: true, status: "declined" });
    }

    let parentId = studentRow?.parentId ?? null;
    let inviteLink: string | null = null;
    if (parentEmail) {
      const invited = await inviteSchoolUser({
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tenantName: session.tenantName,
        email: parentEmail,
        name: parentName || "Parent",
        role: "PARENT",
        phone: parentPhone,
      });
      parentId = invited.userId;
      inviteLink = invited.inviteLink;
    }
    if (!parentId) {
      throw new ApiError("This application needs a parent email before you can enroll and invite.");
    }

    let studentId = application?.studentId ?? studentRow?.id ?? null;
    if (studentRow) {
      const { error } = await admin
        .from("Student")
        .update({
          parentId,
          classId: body.classId || null,
          status: "enrolled",
          notes,
        })
        .eq("id", studentRow.id);
      throwIfError(error, "Could not enroll that child.");
      studentId = studentRow.id;
    } else if (!studentId) {
      const { data: student, error } = await admin
        .from("Student")
        .insert({
          tenantId: session.tenantId,
          firstName,
          lastName,
          dateOfBirth: application?.dateOfBirth || null,
          gender: application?.gender || null,
          notes,
          parentId,
          classId: body.classId || null,
          status: "enrolled",
        })
        .select("id")
        .single();
      throwIfError(error, "Could not enroll that child.");
      studentId = student?.id;
    }

    if (application) {
      await admin
        .from("EnrollmentApplication")
        .update({ status: "enrolled", studentId })
        .eq("id", id);
    }

    const childName = `${firstName} ${lastName}`;
    const confirmed = enrollmentConfirmedEmail({
      schoolName: session.tenantName ?? "your school",
      parentName,
      childName,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: parentEmail,
      subject: confirmed.subject,
      body: confirmed.body,
      event: "student_enrolled",
    });

    if (inviteLink && parentEmail) {
      const welcome = parentWelcomeEmail({
        schoolName: session.tenantName ?? "your school",
        parentName,
        email: parentEmail,
        inviteLink,
        schoolCode: session.tenantSlug,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: welcome.subject,
        body: welcome.body,
        event: "parent_welcome",
      });
    }

    return json({ ok: true, status: "enrolled", studentId });
  } catch (err) {
    return handleApiError(err);
  }
}

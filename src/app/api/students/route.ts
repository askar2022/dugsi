import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentConfirmedEmail, parentWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
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
    const reader = createAdminClient();
    let query = reader
      .from("Student")
      .select("*, class:Class(*, teacher:User!teacherId(id, name)), parent:User!parentId(id, name, email, phone)")
      .eq("tenantId", session.tenantId)
      .order("lastName")
      .order("firstName");
    if (session.role === "PARENT") query = query.eq("parentId", session.userId);
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
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = studentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the student's first and last name.");
    }

    let parentId: string | undefined;
    let inviteLink: string | null = null;
    const parentEmail = parsed.data.parentEmail?.trim().toLowerCase();
    if (parentEmail) {
      const invited = await inviteSchoolUser({
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tenantName: session.tenantName,
        email: parentEmail,
        name: parsed.data.parentName || "Parent",
        role: "PARENT",
        phone: parsed.data.parentPhone,
      });
      parentId = invited.userId;
      inviteLink = invited.inviteLink;
    }

    const writer = createAdminClient();
    const { data: student, error } = await writer
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

    if (parentEmail) {
      const childName = `${student.firstName} ${student.lastName}`;
      const confirmed = enrollmentConfirmedEmail({
        schoolName: session.tenantName ?? "your school",
        parentName: parsed.data.parentName,
        childName,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: confirmed.subject,
        body: confirmed.body,
        event: "student_enrolled",
      });
      if (inviteLink) {
        const welcome = parentWelcomeEmail({
          schoolName: session.tenantName ?? "your school",
          parentName: parsed.data.parentName || "Parent",
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
    }

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

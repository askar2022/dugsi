import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { enrollmentReceivedEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { enrollSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["PARENT"]);
    const parsed = enrollSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter your child's first and last name.");
    }
    const admin = createAdminClient();
    const { data: student, error } = await admin
      .from("Student")
      .insert({
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth || null,
        gender: parsed.data.gender || null,
        notes: parsed.data.notes || null,
        parentId: session.userId,
        status: "pending",
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save that child.");

    const copy = enrollmentReceivedEmail({
      schoolName: session.tenantName ?? "your school",
      parentName: session.name,
      childName: `${student.firstName} ${student.lastName}`,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: session.email,
      subject: copy.subject,
      body: copy.body,
      event: "student_enrolled",
    });

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

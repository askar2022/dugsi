import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { enrollSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["PARENT"]);
    const parsed = enrollSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter your child's first and last name.");
    }
    const { data: student, error } = await supabase
      .from("Student")
      .insert({
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        notes: parsed.data.notes,
        parentId: session.userId,
        status: "pending",
      })
      .select("*")
      .single();
    throwIfError(error, "Could not submit enrollment.");

    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: session.email,
      subject: `Enrollment received for ${student.firstName}`,
      body: `${session.tenantName} received an enrollment request for ${student.firstName} ${student.lastName}.`,
      event: "student_enrolled",
    });

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

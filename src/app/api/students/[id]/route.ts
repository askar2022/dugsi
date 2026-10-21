import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
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
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    await getTenantStudent(request, id);
    const parsed = studentSchema.partial().safeParse(await request.json());
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
      .select("*")
      .single();
    throwIfError(error, "Could not update the student.");
    return json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

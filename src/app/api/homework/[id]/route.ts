import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { homeworkCompletionSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { session } = await requireAuthedTenant(request, ["PARENT"]);
    const parsed = homeworkCompletionSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Choose Done or Needs help.");
    }

    const admin = createAdminClient();
    const { data: homework, error: homeworkError } = await admin
      .from("Homework")
      .select("id, tenantId, classId, studentId")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(homeworkError, "Could not find that homework.");
    if (!homework) throw new ApiError("Homework not found.", 404);
    if (homework.studentId && homework.studentId !== parsed.data.studentId) {
      throw new ApiError("That homework is not for this child.", 403);
    }

    const { data: student, error: studentError } = await admin
      .from("Student")
      .select("id, parentId, classId, status")
      .eq("id", parsed.data.studentId)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(studentError, "Could not find that child.");
    if (!student || student.parentId !== session.userId) {
      throw new ApiError("You can only update homework for your own child.", 403);
    }
    if (student.classId !== homework.classId) {
      throw new ApiError("That homework is not for this child's class.", 403);
    }

    const { data: completion, error } = await admin
      .from("HomeworkCompletion")
      .upsert(
        {
          homeworkId: homework.id,
          studentId: student.id,
          status: parsed.data.status,
        },
        { onConflict: "homeworkId,studentId" },
      )
      .select("*")
      .single();
    throwIfError(error, "Could not update homework.");
    return json({ completion });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { ApiError, getTenantClass, getTenantStudent, handleApiError } from "@/lib/guard";
import { homeworkTitle } from "@/lib/homework";
import { json } from "@/lib/http";
import { juzFor, surahByName } from "@/lib/quran";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { homeworkCompletionSchema, homeworkSchema } from "@/lib/validators";

async function updateParentCompletion(
  request: NextRequest,
  id: string,
  body: unknown,
) {
  const { session } = await requireAuthedTenant(request, ["PARENT"]);
  const parsed = homeworkCompletionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("Choose Done or Need Help.");
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
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body.status === "done" || body.status === "needs_help") {
      return updateParentCompletion(request, id, body);
    }

    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = homeworkSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("Enter the class, homework type, Surah, and ayah range.");
    }
    const { schoolClass } = await getTenantClass(request, parsed.data.classId);
    const selectedIds = (parsed.data.studentIds ?? []).filter(Boolean);
    const singleId =
      parsed.data.studentId && parsed.data.studentId !== "all"
        ? parsed.data.studentId
        : selectedIds.length === 1
          ? selectedIds[0]
          : null;
    let targetStudent: { id: string } | null = null;
    if (singleId) {
      const { student } = await getTenantStudent(request, singleId);
      if (student.classId !== schoolClass.id) {
        throw new ApiError("That student is not in the selected class.");
      }
      if (student.status === "unenrolled" || student.status === "declined") {
        throw new ApiError("That student is no longer enrolled.");
      }
      targetStudent = student;
    }

    const matched = surahByName(parsed.data.surah);
    const juz = parsed.data.juz ?? (matched ? juzFor(matched.number, parsed.data.ayahFrom) : undefined);
    const title = homeworkTitle({
      kind: parsed.data.kind,
      surah: parsed.data.surah,
      ayahFrom: parsed.data.ayahFrom,
      ayahTo: parsed.data.ayahTo,
      fallback: parsed.data.title,
    });

    const admin = createAdminClient();
    const { data: existing, error: foundError } = await admin
      .from("Homework")
      .select("id, classId, studentId, assignedDate")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(foundError, "Could not find that homework.");
    if (!existing) throw new ApiError("Homework not found.", 404);

    const { data: homework, error } = await admin
      .from("Homework")
      .update({
        classId: schoolClass.id,
        studentId: selectedIds.length > 1 ? null : targetStudent?.id ?? null,
        kind: parsed.data.kind,
        surah: parsed.data.surah,
        ayahFrom: parsed.data.ayahFrom,
        ayahTo: parsed.data.ayahTo,
        juz: juz ?? null,
        title,
        description: parsed.data.description,
        assignedDate: parsed.data.assignedDate || existing.assignedDate || new Date().toISOString().slice(0, 10),
        dueDate: parsed.data.dueDate || null,
      })
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .select("*")
      .single();
    throwIfError(error, "Could not update homework.");

    let studentsQuery = admin
      .from("Student")
      .select("id")
      .eq("tenantId", session.tenantId)
      .eq("classId", schoolClass.id)
      .neq("status", "unenrolled")
      .neq("status", "declined")
      .neq("status", "pending")
      .neq("status", "waiting_assessment");
    if (selectedIds.length > 1) studentsQuery = studentsQuery.in("id", selectedIds);
    else if (targetStudent) studentsQuery = studentsQuery.eq("id", targetStudent.id);
    const { data: students } = await studentsQuery;
    const keepIds = (students ?? []).map((student) => student.id);
    if (keepIds.length) {
      await admin.from("HomeworkCompletion").delete().eq("homeworkId", id).not("studentId", "in", `(${keepIds.join(",")})`);
      const { data: current } = await admin.from("HomeworkCompletion").select("studentId").eq("homeworkId", id);
      const have = new Set((current ?? []).map((row) => row.studentId));
      const missing = keepIds.filter((studentId) => !have.has(studentId));
      if (missing.length) {
        await admin.from("HomeworkCompletion").insert(
          missing.map((studentId) => ({ homeworkId: id, studentId, status: "assigned" })),
        );
      }
    }

    return json({ homework });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const admin = createAdminClient();
    const { data: existing, error: foundError } = await admin
      .from("Homework")
      .select("id, classId")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(foundError, "Could not find that homework.");
    if (!existing) throw new ApiError("Homework not found.", 404);
    await getTenantClass(request, existing.classId);
    const { error } = await admin.from("Homework").delete().eq("id", id).eq("tenantId", session.tenantId);
    throwIfError(error, "Could not delete that homework.");
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { emailParentIfContactNeeded } from "@/lib/progress-email";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { progressSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const body = await request.json().catch(() => ({}));
    const parsed = progressSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new ApiError("Check the student, Surah, ayah range, and progress status.");
    }
    if (!Object.keys(parsed.data).length) {
      throw new ApiError("Choose a progress color.");
    }

    const { data: existing, error: foundError } = await supabase
      .from("QuranProgress")
      .select("id, studentId, surah, ayahFrom, ayahTo, juz, date, status")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(foundError, "Could not find that progress record.");
    if (!existing) throw new ApiError("Progress record not found.", 404);

    let studentId = existing.studentId;
    if (parsed.data.studentId) {
      const { student } = await getTenantStudent(request, parsed.data.studentId);
      studentId = student.id;
    }
    const status = parsed.data.status
      ? normalizeProgressStatus(parsed.data.status)
      : normalizeProgressStatus(existing.status);

    const { data: progress, error } = await supabase
      .from("QuranProgress")
      .update({
        studentId,
        surah: parsed.data.surah ?? existing.surah,
        ayahFrom: parsed.data.ayahFrom ?? existing.ayahFrom,
        ayahTo: parsed.data.ayahTo ?? existing.ayahTo,
        juz: parsed.data.juz ?? existing.juz,
        date: parsed.data.date ?? existing.date,
        status,
      })
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .select("*")
      .single();
    throwIfError(error, "Could not update progress.");

    if (status === "contact_parent" && existing.status !== "contact_parent") {
      await emailParentIfContactNeeded({
        tenantId: session.tenantId,
        tenantName: session.tenantName,
        studentId,
        surah: progress.surah,
        ayahFrom: progress.ayahFrom,
        ayahTo: progress.ayahTo,
        date: progress.date,
        progressId: existing.id,
        status,
      });
    }

    return json({ progress });
  } catch (err) {
    return handleApiError(err);
  }
}

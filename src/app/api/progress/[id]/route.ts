import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { emailParentIfContactNeeded } from "@/lib/progress-email";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const body = await request.json().catch(() => ({}));
    const status = normalizeProgressStatus(typeof body.status === "string" ? body.status : "");
    if (!body.status) throw new ApiError("Choose a progress color.");

    const { data: existing, error: foundError } = await supabase
      .from("QuranProgress")
      .select("id, studentId, surah, ayahFrom, ayahTo, date, status")
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .maybeSingle();
    throwIfError(foundError, "Could not find that progress record.");
    if (!existing) throw new ApiError("Progress record not found.", 404);

    const { data: progress, error } = await supabase
      .from("QuranProgress")
      .update({ status })
      .eq("id", id)
      .eq("tenantId", session.tenantId)
      .select("*")
      .single();
    throwIfError(error, "Could not update progress.");

    if (status === "contact_parent" && existing.status !== "contact_parent") {
      await emailParentIfContactNeeded({
        tenantId: session.tenantId,
        tenantName: session.tenantName,
        studentId: existing.studentId,
        surah: existing.surah,
        ayahFrom: existing.ayahFrom,
        ayahTo: existing.ayahTo,
        date: existing.date,
        progressId: existing.id,
        status,
      });
    }

    return json({ progress });
  } catch (err) {
    return handleApiError(err);
  }
}

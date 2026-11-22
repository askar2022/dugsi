import { NextRequest } from "next/server";
import { isAssessmentClass } from "@/lib/assessment-class";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { isMissingRelation } from "@/lib/errors";
import { assignableKeysForOffered, isAssignableSubjectKey, isOfferedSubjectKey } from "@/lib/subjects";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { subjectAssignmentsSchema } from "@/lib/validators";

const MISSING_SQL = "Paste the subjects SQL in Supabase first, then try again.";

export async function PUT(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = subjectAssignmentsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Choose a class and a teacher for each subject.");
    }

    const admin = createAdminClient();
    const [klassRes, offeredRes] = await Promise.all([
      admin.from("Class").select("id, name, level").eq("id", parsed.data.classId).eq("tenantId", session.tenantId).maybeSingle(),
      admin.from("TenantSubject").select("subjectKey").eq("tenantId", session.tenantId),
    ]);
    if (isMissingRelation(offeredRes.error)) {
      throw new ApiError(MISSING_SQL, 409);
    }
    throwIfError(klassRes.error, "Could not load that class.");
    throwIfError(offeredRes.error, "Could not load subjects.");
    if (!klassRes.data || isAssessmentClass(klassRes.data)) {
      throw new ApiError("Choose a class.", 404);
    }

    const offered = (offeredRes.data ?? []).map((row) => row.subjectKey).filter(isOfferedSubjectKey);
    const allowed = new Set(assignableKeysForOffered(offered));
    const rows = parsed.data.assignments.filter((item) => isAssignableSubjectKey(item.subjectKey) && allowed.has(item.subjectKey));

    for (const item of rows) {
      const teacherId = item.teacherId?.trim() || null;
      if (teacherId) {
        const teacher = await admin
          .from("User")
          .select("id")
          .eq("id", teacherId)
          .eq("tenantId", session.tenantId)
          .eq("role", "TEACHER")
          .maybeSingle();
        throwIfError(teacher.error, "Could not check that teacher.");
        if (!teacher.data) {
          throw new ApiError("Choose a teacher from this dugsi.");
        }
        const saved = await admin.from("ClassSubjectTeacher").upsert(
          {
            tenantId: session.tenantId,
            classId: parsed.data.classId,
            subjectKey: item.subjectKey,
            teacherId,
          },
          { onConflict: "tenantId,classId,subjectKey" },
        );
        if (isMissingRelation(saved.error)) {
          throw new ApiError(MISSING_SQL, 409);
        }
        throwIfError(saved.error, "Could not save that teacher.");
      } else {
        const cleared = await admin
          .from("ClassSubjectTeacher")
          .delete()
          .eq("tenantId", session.tenantId)
          .eq("classId", parsed.data.classId)
          .eq("subjectKey", item.subjectKey);
        if (isMissingRelation(cleared.error)) {
          throw new ApiError(MISSING_SQL, 409);
        }
        throwIfError(cleared.error, "Could not clear that teacher.");
      }
    }

    return json({ saved: true });
  } catch (err) {
    return handleApiError(err);
  }
}

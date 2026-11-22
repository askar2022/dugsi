import { NextRequest } from "next/server";
import { isAssessmentClass } from "@/lib/assessment-class";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { isMissingRelation } from "@/lib/errors";
import {
  ASSIGNABLE_SUBJECT_KEYS,
  SUBJECTS,
  assignableKeysForOffered,
  isOfferedSubjectKey,
} from "@/lib/subjects";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { offeredSubjectsSchema } from "@/lib/validators";

const MISSING_SQL = "Paste the subjects SQL in Supabase first, then try again.";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const admin = createAdminClient();
    const [offeredRes, assignmentRes, classRes, teacherRes] = await Promise.all([
      admin.from("TenantSubject").select("subjectKey").eq("tenantId", session.tenantId),
      admin
        .from("ClassSubjectTeacher")
        .select("id, classId, subjectKey, teacherId, teacher:User!teacherId(id, name)")
        .eq("tenantId", session.tenantId),
      admin.from("Class").select("id, name, level, teacherId, teacher:User!teacherId(id, name)").eq("tenantId", session.tenantId).order("name"),
      admin.from("User").select("id, name").eq("tenantId", session.tenantId).eq("role", "TEACHER").order("name"),
    ]);
    if (isMissingRelation(offeredRes.error) || isMissingRelation(assignmentRes.error)) {
      throw new ApiError(MISSING_SQL, 409);
    }
    throwIfError(offeredRes.error, "Could not load subjects.");
    throwIfError(assignmentRes.error, "Could not load subject teachers.");
    throwIfError(classRes.error, "Could not load classes.");
    throwIfError(teacherRes.error, "Could not load teachers.");

    const offered = (offeredRes.data ?? [])
      .map((row) => row.subjectKey)
      .filter(isOfferedSubjectKey);
    const classes = (classRes.data ?? [])
      .filter((item) => !isAssessmentClass(item))
      .map((item) => {
        const teacher = Array.isArray(item.teacher) ? item.teacher[0] : item.teacher;
        return {
          id: item.id,
          name: item.name,
          teacherId: item.teacherId,
          teacherName: teacher?.name ?? "No teacher yet",
        };
      });

    return json({
      catalog: SUBJECTS,
      offered,
      assignable: assignableKeysForOffered(offered),
      teachers: teacherRes.data ?? [],
      classes,
      assignments: (assignmentRes.data ?? [])
        .filter((row) => (ASSIGNABLE_SUBJECT_KEYS as readonly string[]).includes(row.subjectKey))
        .map((row) => {
          const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher;
          return {
            classId: row.classId,
            subjectKey: row.subjectKey,
            teacherId: row.teacherId,
            teacherName: teacher?.name ?? null,
          };
        }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = offeredSubjectsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Choose the subjects this dugsi offers.");
    }
    const offered = [...new Set(parsed.data.subjectKeys.filter(isOfferedSubjectKey))];
    const allowed = new Set(assignableKeysForOffered(offered));
    const admin = createAdminClient();

    const existing = await admin.from("TenantSubject").select("id, subjectKey").eq("tenantId", session.tenantId);
    if (isMissingRelation(existing.error)) {
      throw new ApiError(MISSING_SQL, 409);
    }
    throwIfError(existing.error, "Could not load subjects.");

    const have = new Set((existing.data ?? []).map((row) => row.subjectKey));
    const toAdd = offered.filter((key) => !have.has(key));
    const toRemove = (existing.data ?? []).filter((row) => !offered.includes(row.subjectKey as typeof offered[number]));

    if (toAdd.length) {
      const inserted = await admin.from("TenantSubject").insert(
        toAdd.map((subjectKey) => ({ tenantId: session.tenantId, subjectKey })),
      );
      throwIfError(inserted.error, "Could not save subjects.");
    }
    if (toRemove.length) {
      const removed = await admin
        .from("TenantSubject")
        .delete()
        .eq("tenantId", session.tenantId)
        .in("id", toRemove.map((row) => row.id));
      throwIfError(removed.error, "Could not update subjects.");
    }

    const assignments = await admin
      .from("ClassSubjectTeacher")
      .select("id, subjectKey")
      .eq("tenantId", session.tenantId);
    if (!isMissingRelation(assignments.error)) {
      throwIfError(assignments.error, "Could not update subject teachers.");
      const stale = (assignments.data ?? []).filter((row) => !allowed.has(row.subjectKey as typeof ASSIGNABLE_SUBJECT_KEYS[number]));
      if (stale.length) {
        const cleared = await admin
          .from("ClassSubjectTeacher")
          .delete()
          .eq("tenantId", session.tenantId)
          .in("id", stale.map((row) => row.id));
        throwIfError(cleared.error, "Could not update subject teachers.");
      }
    }

    return json({ offered });
  } catch (err) {
    return handleApiError(err);
  }
}

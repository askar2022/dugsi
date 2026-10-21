import { throwIfError } from "@/lib/supabase/request";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ASSESSMENT_CLASS_NAME = "Waiting for assessment";
export const ASSESSMENT_CLASS_LEVEL = "assessment";

export function isAssessmentClass(item?: { name?: string | null; level?: string | null } | null) {
  if (!item) return false;
  return item.level === ASSESSMENT_CLASS_LEVEL || item.name === ASSESSMENT_CLASS_NAME;
}

export function needsClassPlacement(
  student: {
    status: string;
    classId?: string | null;
    class?: { id?: string | null; name?: string | null; level?: string | null } | null;
  },
  assessmentClassId?: string | null,
) {
  if (student.status === "declined" || student.status === "unenrolled") return false;
  if (student.status === "waiting_assessment" || student.status === "pending") return true;
  const classId = student.classId ?? student.class?.id ?? null;
  if (!classId) return true;
  if (assessmentClassId && classId === assessmentClassId) return true;
  return isAssessmentClass(student.class);
}

export function classPlaceLabel(student: {
  status?: string | null;
  class?: { name?: string | null; level?: string | null } | null;
}) {
  if (student.status === "waiting_assessment" || student.status === "pending" || isAssessmentClass(student.class)) {
    return ASSESSMENT_CLASS_NAME;
  }
  return student.class?.name ?? "Waiting for assessment";
}

export async function ensureWaitingStudent(
  admin: SupabaseClient,
  tenantId: string,
  input: {
    studentId?: string | null;
    firstName: string;
    lastName: string;
    age?: number | null;
    address?: string | null;
    gender?: string | null;
    parentId?: string | null;
    notes?: string | null;
  },
) {
  const holding = await ensureAssessmentClass(admin, tenantId);
  if (input.studentId) {
    const { error } = await admin
      .from("Student")
      .update({
        classId: holding.id,
        status: "waiting_assessment",
        age: input.age ?? undefined,
        address: input.address ?? undefined,
        gender: input.gender ?? undefined,
        parentId: input.parentId ?? undefined,
        notes: input.notes ?? undefined,
      })
      .eq("id", input.studentId)
      .eq("tenantId", tenantId);
    if (error) {
      await admin
        .from("Student")
        .update({ classId: holding.id, status: "waiting_assessment" })
        .eq("id", input.studentId)
        .eq("tenantId", tenantId);
    }
    return { studentId: input.studentId, holding };
  }

  const { data: student, error } = await admin
    .from("Student")
    .insert({
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      age: input.age ?? null,
      address: input.address ?? null,
      gender: input.gender ?? null,
      parentId: input.parentId ?? null,
      notes: input.notes ?? null,
      classId: holding.id,
      status: "waiting_assessment",
    })
    .select("id")
    .single();
  if (!error && student) return { studentId: student.id, holding };

  const { data: basic, error: basicError } = await admin
    .from("Student")
    .insert({
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      notes: input.notes ?? null,
      parentId: input.parentId ?? null,
      classId: holding.id,
      status: "waiting_assessment",
    })
    .select("id")
    .single();
  throwIfError(basicError ?? error, "Could not save that child.");
  return { studentId: basic!.id, holding };
}

export async function ensureAssessmentClass(
  admin: SupabaseClient,
  tenantId: string,
) {
  const { data: existing, error: findError } = await admin
    .from("Class")
    .select("id, name, level")
    .eq("tenantId", tenantId)
    .or(`level.eq.${ASSESSMENT_CLASS_LEVEL},name.eq.${ASSESSMENT_CLASS_NAME}`)
    .limit(1);
  throwIfError(findError, "Could not load the assessment class.");
  if (existing?.[0]) return existing[0];

  const { data: created, error } = await admin
    .from("Class")
    .insert({
      tenantId,
      name: ASSESSMENT_CLASS_NAME,
      level: ASSESSMENT_CLASS_LEVEL,
    })
    .select("id, name, level")
    .single();
  throwIfError(error, "Could not create the waiting-for-assessment class.");
  return created;
}

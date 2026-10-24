import { NextRequest } from "next/server";
import { ensureAssessmentClass, ensureWaitingStudent, isAssessmentClass, needsClassPlacement } from "@/lib/assessment-class";
import { findParentIdByEmail } from "@/lib/parent-link";
import {
  assessmentFromNotes,
  assessmentLabel,
  enrollmentStage,
  parseEnrollmentNotes,
} from "@/lib/enrollment-pipeline";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant } from "@/lib/supabase/request";

type ApplicationRow = {
  id: string;
  source: "application" | "student";
  studentId?: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  address: string | null;
  firstName: string;
  lastName: string;
  age: number | null;
  agreedFeeAndEnroll: boolean;
  notes: string | null;
  status: string;
};

type WaitingRow = {
  id: string;
  applicationId: string | null;
  firstName: string;
  lastName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  address: string | null;
  age: number | null;
  status: string;
  classId: string | null;
  className: string | null;
};

function guardianFromNotes(notes: string | null) {
  return parseEnrollmentNotes(notes);
}

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const admin = createAdminClient();
    const applications: ApplicationRow[] = [];

    const { data: rows } = await admin
      .from("EnrollmentApplication")
      .select("*")
      .eq("tenantId", session.tenantId)
      .order("createdAt", { ascending: false });

    for (const item of rows ?? []) {
      const extra = guardianFromNotes(item.notes);
      applications.push({
        id: item.id,
        source: "application",
        studentId: item.studentId ?? null,
        parentName: item.parentName,
        parentEmail: item.parentEmail,
        parentPhone: item.parentPhone,
        address: item.address
          || [extra.address, extra.city, extra.state, extra.zip].filter(Boolean).join(", ")
          || null,
        firstName: item.firstName,
        lastName: item.lastName,
        age: item.age ?? extra.age ?? null,
        agreedFeeAndEnroll: extra.agreedFeeAndEnroll === true,
        notes: extra.notes ?? (extra.address || extra.age ? null : item.notes),
        status: item.status,
      });
    }

    const holding = await ensureAssessmentClass(admin, session.tenantId);

    for (const item of rows ?? []) {
      if (item.status !== "pending" && item.status !== "accepted") continue;
      if (item.status === "accepted" && item.studentId) continue;
      const extra = guardianFromNotes(item.notes);
      const parentId = await findParentIdByEmail(admin, session.tenantId, item.parentEmail ?? extra.guardianEmail);
      const placed = await ensureWaitingStudent(admin, session.tenantId, {
        studentId: item.studentId,
        firstName: item.firstName,
        lastName: item.lastName,
        age: item.age ?? extra.age ?? null,
        address: item.address ?? extra.address ?? null,
        gender: item.gender || null,
        parentId,
        notes: item.notes,
      });
      await admin
        .from("EnrollmentApplication")
        .update({ status: "waiting_assessment", studentId: placed.studentId })
        .eq("id", item.id);
      item.studentId = placed.studentId;
      item.status = "waiting_assessment";
    }

    const { data: students } = await admin
      .from("Student")
      .select("id, firstName, lastName, notes, status, classId, createdAt, class:Class(id, name, level), parent:User!parentId(name, email, phone)")
      .eq("tenantId", session.tenantId)
      .order("createdAt", { ascending: false });

    for (const item of students ?? []) {
      if (item.status !== "pending") continue;
      await ensureWaitingStudent(admin, session.tenantId, {
        studentId: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        notes: item.notes,
      });
      item.status = "waiting_assessment";
      item.classId = holding.id;
    }

    const applicationByStudent = new Map(
      (rows ?? []).filter((item) => item.studentId).map((item) => [item.studentId as string, item]),
    );
    const waiting: WaitingRow[] = [];
    const seen = new Set<string>();
    const pipeline: Array<{
      id: string;
      studentId: string | null;
      applicationId: string | null;
      firstName: string;
      lastName: string;
      parentName: string;
      submittedAt: string | null;
      assessmentLabel: string;
      readingLevel: string;
      stage: string;
      status: string;
      recommendedClassId: string;
      classId: string | null;
      className: string | null;
    }> = [];

    for (const item of students ?? []) {
      if (item.status === "declined" || item.status === "unenrolled") continue;
      const klass = one(item.class);
      const parent = one(item.parent);
      const extra = guardianFromNotes(item.notes);
      const assessment = assessmentFromNotes(item.notes);
      const application = applicationByStudent.get(item.id);
      const stage = enrollmentStage({
        status: item.status,
        hasStudent: true,
        assessment,
      });
      if (needsClassPlacement({ status: item.status, classId: item.classId, class: klass }, holding.id) && stage !== "ready") {
        waiting.push({
          id: item.id,
          applicationId: application?.id ?? null,
          firstName: item.firstName,
          lastName: item.lastName,
          parentName: extra.guardianName ?? parent?.name ?? application?.parentName ?? "—",
          parentEmail: extra.guardianEmail ?? parent?.email ?? application?.parentEmail ?? "",
          parentPhone: extra.guardianPhone ?? parent?.phone ?? application?.parentPhone ?? null,
          address: extra.address ?? application?.address ?? null,
          age: extra.age ?? application?.age ?? null,
          status: item.status,
          classId: item.classId,
          className: klass?.name ?? holding.name,
        });
      }
      seen.add(item.id);
      pipeline.push({
        id: item.id,
        studentId: item.id,
        applicationId: application?.id ?? null,
        firstName: item.firstName,
        lastName: item.lastName,
        parentName: extra.guardianName ?? parent?.name ?? application?.parentName ?? "—",
        submittedAt: application?.createdAt ?? item.createdAt ?? null,
        assessmentLabel: assessmentLabel(assessment),
        readingLevel: assessment?.readingLevel ?? "",
        stage,
        status: stage === "ready" ? "ready_for_class" : stage === "submitted" ? "submitted" : item.status,
        recommendedClassId: assessment?.recommendedClassId ?? "",
        classId: item.classId,
        className: isAssessmentClass(klass) ? null : klass?.name ?? null,
      });
    }

    for (const item of rows ?? []) {
      if (item.studentId && seen.has(item.studentId)) continue;
      if (item.status === "declined") continue;
      pipeline.push({
        id: item.id,
        studentId: item.studentId ?? null,
        applicationId: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        parentName: item.parentName,
        submittedAt: item.createdAt ?? null,
        assessmentLabel: "Not completed",
        readingLevel: "",
        stage: "submitted",
        status: "submitted",
        recommendedClassId: "",
        classId: null,
        className: null,
      });
    }

    return json({
      applications,
      waiting,
      pipeline,
      enrollUrl: `/enroll/${session.tenantSlug}`,
      schoolCode: session.tenantSlug,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { ensureAssessmentClass, ensureWaitingStudent, needsClassPlacement } from "@/lib/assessment-class";
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
  try {
    return notes ? JSON.parse(notes) as {
      guardianName?: string;
      guardianEmail?: string;
      guardianPhone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      age?: number;
      agreedFeeAndEnroll?: boolean;
      notes?: string;
    } : {};
  } catch {
    return {};
  }
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
      const placed = await ensureWaitingStudent(admin, session.tenantId, {
        studentId: item.studentId,
        firstName: item.firstName,
        lastName: item.lastName,
        age: item.age ?? extra.age ?? null,
        address: item.address ?? extra.address ?? null,
        gender: item.gender || null,
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
      .select("id, firstName, lastName, notes, status, classId, class:Class(id, name, level), parent:User!parentId(name, email, phone)")
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

    for (const item of students ?? []) {
      const klass = one(item.class);
      const parent = one(item.parent);
      const extra = guardianFromNotes(item.notes);
      if (!needsClassPlacement({ status: item.status, classId: item.classId, class: klass }, holding.id)) {
        continue;
      }
      const application = applicationByStudent.get(item.id);
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
        status: "waiting_assessment",
        classId: item.classId,
        className: klass?.name ?? holding.name,
      });
    }

    return json({
      applications,
      waiting,
      enrollUrl: `/s/${session.tenantSlug}`,
      schoolCode: session.tenantSlug,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

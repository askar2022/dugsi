import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
import { attachChildrenToParent } from "@/lib/parent-link";
import { emailParentIfContactNeeded } from "@/lib/progress-email";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { progressSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const assignedClassIds = await teacherAssignedClassIds(supabase, session);
    if (assignedClassIds && assignedClassIds.length === 0) {
      return json({ progress: [] });
    }
    const studentId = new URL(request.url).searchParams.get("studentId");
    const reader = session.role === "PARENT" || session.role === "ADMIN" || session.role === "STAFF"
      ? createAdminClient()
      : supabase;
    if (session.role === "PARENT") {
      await attachChildrenToParent(reader, session.tenantId, session.userId, session.email);
    }
    let query = reader
      .from("QuranProgress")
      .select("*, student:Student(id, firstName, lastName, class:Class(id, name, level))")
      .eq("tenantId", session.tenantId)
      .order("date", { ascending: false });
    if (session.role === "PARENT") {
      const { data: kids } = await reader
        .from("Student")
        .select("id")
        .eq("tenantId", session.tenantId)
        .eq("parentId", session.userId);
      const ids = (kids ?? []).map((item) => item.id);
      if (ids.length === 0) return json({ progress: [] });
      if (studentId && !ids.includes(studentId)) return json({ progress: [] });
      query = query.in("studentId", studentId ? [studentId] : ids);
    } else if (studentId) {
      query = query.eq("studentId", studentId);
    }
    if (assignedClassIds) {
      const { data: assignedStudents } = await supabase.from("Student").select("id").in("classId", assignedClassIds);
      const ids = (assignedStudents ?? []).map((item) => item.id);
      if (ids.length === 0) return json({ progress: [] });
      query = query.in("studentId", ids);
    }
    const { data: progress, error } = await query;
    throwIfError(error, "Could not load progress.");
    return json({ progress: progress ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = progressSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the student, surah, and ayah range.");
    }
    const { student } = await getTenantStudent(request, parsed.data.studentId);
    const status = normalizeProgressStatus(parsed.data.status);
    const { data: progress, error } = await supabase
      .from("QuranProgress")
      .insert({
        tenantId: session.tenantId,
        studentId: student.id,
        surah: parsed.data.surah,
        ayahFrom: parsed.data.ayahFrom,
        ayahTo: parsed.data.ayahTo,
        juz: parsed.data.juz,
        notes: parsed.data.notes,
        date: parsed.data.date,
        status,
        recordedById: session.userId,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save progress.");
    await emailParentIfContactNeeded({
      tenantId: session.tenantId,
      tenantName: session.tenantName,
      studentId: student.id,
      surah: progress.surah,
      ayahFrom: progress.ayahFrom,
      ayahTo: progress.ayahTo,
      date: progress.date,
      progressId: progress.id,
      status,
    });
    return json({ progress }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

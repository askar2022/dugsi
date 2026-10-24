import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { homeworkAssignedEmail } from "@/lib/email-messages";
import { ApiError, getTenantClass, getTenantStudent, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { homeworkTitle } from "@/lib/homework";
import { json } from "@/lib/http";
import { juzFor, quranPortion, surahByName } from "@/lib/quran";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { homeworkSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const assignedClassIds = await teacherAssignedClassIds(supabase, session);
    if (assignedClassIds && assignedClassIds.length === 0) {
      return json({ homework: [] });
    }
    let query = supabase
      .from("Homework")
      .select("*, class:Class(id, name), completions:HomeworkCompletion(*, student:Student(id, firstName, lastName))")
      .order("assignedDate", { ascending: false });
    if (assignedClassIds) query = query.in("classId", assignedClassIds);
    const { data: homework, error } = await query;
    throwIfError(error, "Could not load homework.");
    let rows = homework ?? [];
    if (session.role === "PARENT") {
      const admin = createAdminClient();
      const { data: kids } = await admin
        .from("Student")
        .select("id")
        .eq("parentId", session.userId)
        .eq("tenantId", session.tenantId);
      const kidIds = new Set((kids ?? []).map((kid) => kid.id));
      rows = rows.filter((item) => {
        if (item.studentId) return kidIds.has(item.studentId);
        const assigned = (item.completions ?? []).map((row: { studentId: string }) => row.studentId);
        if (assigned.length) return assigned.some((id: string) => kidIds.has(id));
        return true;
      });
    }
    return json({ homework: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = homeworkSchema.safeParse(await request.json());
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
    let targetStudent: { id: string; firstName: string; lastName: string } | null = null;
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

    const { data: homework, error } = await supabase
      .from("Homework")
      .insert({
        tenantId: session.tenantId,
        classId: schoolClass.id,
        studentId: selectedIds.length > 1 ? null : targetStudent?.id ?? null,
        kind: parsed.data.kind,
        surah: parsed.data.surah,
        ayahFrom: parsed.data.ayahFrom,
        ayahTo: parsed.data.ayahTo,
        juz: juz ?? null,
        title,
        description: parsed.data.description,
        assignedDate: parsed.data.assignedDate || new Date().toISOString().slice(0, 10),
        dueDate: parsed.data.dueDate,
        assignedById: session.userId,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not assign homework.");

    const admin = createAdminClient();
    let studentsQuery = admin
      .from("Student")
      .select("id, firstName, lastName, parent:User!parentId(name, email)")
      .eq("tenantId", session.tenantId)
      .eq("classId", schoolClass.id)
      .neq("status", "unenrolled")
      .neq("status", "declined")
      .neq("status", "pending")
      .neq("status", "waiting_assessment");
    if (selectedIds.length > 1) studentsQuery = studentsQuery.in("id", selectedIds);
    else if (targetStudent) studentsQuery = studentsQuery.eq("id", targetStudent.id);
    const { data: students } = await studentsQuery;

    if (students?.length) {
      const { error: completionError } = await admin.from("HomeworkCompletion").insert(
        students.map((student) => ({
          homeworkId: homework.id,
          studentId: student.id,
          status: "assigned",
        })),
      );
      throwIfError(completionError, "Could not assign homework to those students.");
    }

    const portion = quranPortion({
      surah: homework.surah,
      ayahFrom: homework.ayahFrom,
      ayahTo: homework.ayahTo,
      juz: homework.juz,
    });
    const sent = new Set<string>();
    for (const student of students ?? []) {
      const parent = Array.isArray(student.parent) ? student.parent[0] : student.parent;
      if (!parent?.email || sent.has(parent.email)) continue;
      sent.add(parent.email);
      const copy = homeworkAssignedEmail({
        schoolName: session.tenantName ?? "your school",
        parentName: parent.name,
        childName: `${student.firstName} ${student.lastName}`,
        title: homework.title,
        portion,
        instructions: homework.description,
        dueDate: homework.dueDate,
        homeworkId: homework.id,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parent.email,
        subject: copy.subject,
        body: copy.body,
        event: "homework_assigned",
      });
    }

    return json({ homework }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

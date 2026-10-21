import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { homeworkAssignedEmail } from "@/lib/email-messages";
import { ApiError, getTenantClass, getTenantStudent, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
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
      const ids = rows.map((item) => item.id);
      const { data: kids } = await admin.from("Student").select("id").eq("parentId", session.userId).eq("tenantId", session.tenantId);
      const { data: completions } = ids.length
        ? await admin.from("HomeworkCompletion").select("homeworkId, studentId").in("homeworkId", ids)
        : { data: [] };
      const kidIds = new Set((kids ?? []).map((kid) => kid.id));
      const assigned = new Map<string, string[]>();
      for (const row of completions ?? []) {
        const list = assigned.get(row.homeworkId) ?? [];
        list.push(row.studentId);
        assigned.set(row.homeworkId, list);
      }
      rows = rows.filter((item) => {
        const targets = assigned.get(item.id) ?? [];
        return targets.length === 0 || targets.some((studentId) => kidIds.has(studentId));
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
      throw new ApiError("Enter a homework title and class.");
    }
    const { schoolClass } = await getTenantClass(request, parsed.data.classId);
    let targetStudent: { id: string; firstName: string; lastName: string } | null = null;
    if (parsed.data.studentId && parsed.data.studentId !== "all") {
      const { student } = await getTenantStudent(request, parsed.data.studentId);
      if (student.classId !== schoolClass.id) {
        throw new ApiError("That student is not in the selected class.");
      }
      if (student.status === "unenrolled" || student.status === "declined") {
        throw new ApiError("That student is no longer enrolled.");
      }
      targetStudent = student;
    }

    const { data: homework, error } = await supabase
      .from("Homework")
      .insert({
        tenantId: session.tenantId,
        classId: schoolClass.id,
        title: parsed.data.title,
        description: parsed.data.description,
        assignedDate: parsed.data.assignedDate,
        dueDate: parsed.data.dueDate,
        assignedById: session.userId,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not assign homework.");

    if (targetStudent) {
      const { error: completionError } = await supabase.from("HomeworkCompletion").insert({
        homeworkId: homework.id,
        studentId: targetStudent.id,
        status: "assigned",
      });
      throwIfError(completionError, "Could not assign homework to that student.");
    }

    let studentsQuery = supabase
      .from("Student")
      .select("id, firstName, lastName, parent:User!parentId(name, email)")
      .eq("classId", schoolClass.id);
    if (targetStudent) studentsQuery = studentsQuery.eq("id", targetStudent.id);
    const { data: students } = await studentsQuery;
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

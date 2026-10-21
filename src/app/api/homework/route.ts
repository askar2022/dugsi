import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { homeworkAssignedEmail } from "@/lib/email-messages";
import { ApiError, getTenantClass, handleApiError, teacherAssignedClassIds } from "@/lib/guard";
import { json } from "@/lib/http";
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
      .select("*, class:Class(id, name), completions:HomeworkCompletion(*)")
      .order("assignedDate", { ascending: false });
    if (assignedClassIds) query = query.in("classId", assignedClassIds);
    const { data: homework, error } = await query;
    throwIfError(error, "Could not load homework.");
    return json({ homework: homework ?? [] });
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

    const { data: students } = await supabase
      .from("Student")
      .select("firstName, lastName, parent:User!parentId(name, email)")
      .eq("classId", schoolClass.id);
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

import { NextRequest } from "next/server";
import { ApiError, getTenantClass, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { attachChildrenToParent } from "@/lib/parent-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { attendanceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const url = new URL(request.url);
    const reader = session.role === "PARENT" || session.role === "ADMIN" || session.role === "STAFF"
      ? createAdminClient()
      : supabase;
    let childIds: string[] | null = null;
    if (session.role === "PARENT") {
      await attachChildrenToParent(reader, session.tenantId, session.userId, session.email);
      const { data: kids } = await reader
        .from("Student")
        .select("id")
        .eq("tenantId", session.tenantId)
        .eq("parentId", session.userId);
      childIds = (kids ?? []).map((item) => item.id);
      if (childIds.length === 0) return json({ attendance: [] });
    }
    let query = reader
      .from("Attendance")
      .select("*, student:Student(id, firstName, lastName), class:Class(id, name)")
      .eq("tenantId", session.tenantId)
      .order("date", { ascending: false });
    const classId = url.searchParams.get("classId");
    const date = url.searchParams.get("date");
    const studentId = url.searchParams.get("studentId");
    if (classId) query = query.eq("classId", classId);
    if (date) query = query.eq("date", date);
    if (studentId) {
      if (childIds && !childIds.includes(studentId)) return json({ attendance: [] });
      query = query.eq("studentId", studentId);
    } else if (childIds) {
      query = query.in("studentId", childIds);
    }
    const { data: attendance, error } = await query;
    throwIfError(error, "Could not load attendance.");
    return json({ attendance: attendance ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = attendanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Choose a class, date, and attendance marks.");
    }
    const { schoolClass } = await getTenantClass(request, parsed.data.classId);
    const rows = [];
    for (const mark of parsed.data.marks) {
      const { data, error } = await supabase
        .from("Attendance")
        .upsert(
          {
            tenantId: session.tenantId,
            studentId: mark.studentId,
            classId: schoolClass.id,
            date: parsed.data.date,
            status: mark.status,
            markedById: session.userId,
          },
          { onConflict: "tenantId,studentId,classId,date" },
        )
        .select("*")
        .single();
      throwIfError(error, "Could not save attendance.");
      if (data) rows.push(data);
    }
    return json({ attendance: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

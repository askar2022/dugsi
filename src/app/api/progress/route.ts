import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { progressSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const studentId = new URL(request.url).searchParams.get("studentId");
    let query = supabase
      .from("QuranProgress")
      .select("*, student:Student(id, firstName, lastName)")
      .order("date", { ascending: false });
    if (studentId) query = query.eq("studentId", studentId);
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
        recordedById: session.userId,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save progress.");
    return json({ progress }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

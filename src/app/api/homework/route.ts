import { NextRequest } from "next/server";
import { ApiError, getTenantClass, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { homeworkSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const { data: homework, error } = await supabase
      .from("Homework")
      .select("*, class:Class(id, name), completions:HomeworkCompletion(*)")
      .order("assignedDate", { ascending: false });
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
    return json({ homework }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

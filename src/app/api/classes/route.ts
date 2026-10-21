import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { classSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const { data: classes, error } = await supabase
      .from("Class")
      .select("*, teacher:User!teacherId(id, name, email), students:Student(id)")
      .order("name");
    throwIfError(error, "Could not load classes.");
    return json({
      classes: (classes ?? []).map((item) => ({
        ...item,
        _count: { students: item.students?.length ?? 0 },
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = classSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter a class name.");
    }
    const { data: schoolClass, error } = await supabase
      .from("Class")
      .insert({
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
        level: parsed.data.level,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        room: parsed.data.room,
        teacherId: parsed.data.teacherId || null,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not create the class.");
    return json({ class: schoolClass }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

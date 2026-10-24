import { NextRequest } from "next/server";
import { error } from "./http";
import { ApiError } from "./errors";
import { createAdminClient } from "./supabase/admin";
import { requireAuthedTenant, getAuthedClient } from "./supabase/request";
import type { Role, Session } from "./types";

export { ApiError };

export async function requireSession(request: NextRequest) {
  const { session } = await getAuthedClient(request);
  return session;
}

export async function requireTenantSession(request: NextRequest) {
  const { session } = await requireAuthedTenant(request);
  return session;
}

export async function requireRoles(request: NextRequest, roles: Role[]) {
  const { session } = await requireAuthedTenant(request, roles);
  return session;
}

export function tenantWhere(session: { tenantId: string }) {
  return { tenantId: session.tenantId };
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return error(err.message, err.status);
  }
  console.error(err);
  return error("Something went wrong.", 500);
}

export async function getTenantStudent(
  request: NextRequest,
  studentId: string,
) {
  const { supabase, session } = await requireAuthedTenant(request);
  const { data: student, error } = await supabase
    .from("Student")
    .select("*, class:Class(*), parent:User!parentId(id, name, email, phone)")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !student) {
    throw new ApiError("Student not found in this dugsi.", 404);
  }
  return { student, session, supabase };
}

export async function teacherAssignedClassIds(
  _supabase: Awaited<ReturnType<typeof requireAuthedTenant>>["supabase"],
  session: { role: Role; userId: string; tenantId?: string | null },
) {
  if (session.role !== "TEACHER") return null;
  const admin = createAdminClient();
  let query = admin.from("Class").select("id").eq("teacherId", session.userId);
  if (session.tenantId) query = query.eq("tenantId", session.tenantId);
  const { data, error } = await query;
  if (error) {
    throw new ApiError("Could not load assigned classes.");
  }
  return (data ?? []).map((item) => item.id);
}

export async function getTenantClass(request: NextRequest, classId: string) {
  const { supabase, session } = await requireAuthedTenant(request);
  const { data: schoolClass, error } = await supabase
    .from("Class")
    .select("*")
    .eq("id", classId)
    .maybeSingle();
  if (error || !schoolClass) {
    throw new ApiError("Class not found in this dugsi.", 404);
  }
  if (session.role === "TEACHER" && schoolClass.teacherId !== session.userId) {
    throw new ApiError("You can only manage your own class.", 403);
  }
  return { schoolClass, session, supabase };
}

import { NextRequest } from "next/server";
import { getSessionFromRequest } from "./auth";
import { error } from "./http";
import { prisma } from "./prisma";
import type { Role, Session } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new ApiError("Sign in required.", 401);
  }
  return session;
}

export async function requireTenantSession(request: NextRequest) {
  const session = await requireSession(request);
  if (!session.tenantId) {
    throw new ApiError("This action belongs to a school account.", 403);
  }
  return session as Session & { tenantId: string };
}

export async function requireRoles(request: NextRequest, roles: Role[]) {
  const session = await requireTenantSession(request);
  if (!roles.includes(session.role)) {
    throw new ApiError("You do not have access to this action.", 403);
  }
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
  session: { tenantId: string; role: Role; userId: string },
  studentId: string,
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId: session.tenantId },
    include: { class: true, parent: { select: { id: true, name: true, email: true } } },
  });
  if (!student) {
    throw new ApiError("Student not found in this dugsi.", 404);
  }
  if (session.role === "PARENT" && student.parentId !== session.userId) {
    throw new ApiError("You can only view your own children.", 403);
  }
  if (session.role === "TEACHER" && student.class?.teacherId !== session.userId) {
    throw new ApiError("You can only view students in your class.", 403);
  }
  return student;
}

export async function getTenantClass(
  session: { tenantId: string; role: Role; userId: string },
  classId: string,
) {
  const schoolClass = await prisma.class.findFirst({
    where: { id: classId, tenantId: session.tenantId },
  });
  if (!schoolClass) {
    throw new ApiError("Class not found in this dugsi.", 404);
  }
  if (session.role === "TEACHER" && schoolClass.teacherId !== session.userId) {
    throw new ApiError("You can only manage your own class.", 403);
  }
  return schoolClass;
}

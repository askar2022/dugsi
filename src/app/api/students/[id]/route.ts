import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError, requireRoles } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const { id } = await context.params;
    const student = await getTenantStudent(session, id);
    return json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    const current = await getTenantStudent(session, id);
    const parsed = studentSchema.partial().safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Check the student details and try again.");
    }

    if (parsed.data.classId) {
      const schoolClass = await prisma.class.findFirst({
        where: { id: parsed.data.classId, tenantId: session.tenantId },
      });
      if (!schoolClass) {
        throw new ApiError("That class is not part of this dugsi.", 404);
      }
    }

    const student = await prisma.student.update({
      where: { id: current.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        classId: parsed.data.classId,
        notes: parsed.data.notes,
        status: parsed.data.status,
      },
    });

    return json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

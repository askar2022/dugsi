import { NextRequest } from "next/server";
import {
  ApiError,
  getTenantClass,
  handleApiError,
  requireRoles,
  tenantWhere,
} from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { attendanceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId") ?? undefined;
    const date = url.searchParams.get("date") ?? undefined;
    const studentId = url.searchParams.get("studentId") ?? undefined;

    const where = {
      ...tenantWhere(session),
      ...(classId ? { classId } : {}),
      ...(date ? { date } : {}),
      ...(studentId ? { studentId } : {}),
    };

    if (session.role === "PARENT") {
      Object.assign(where, { student: { parentId: session.userId, tenantId: session.tenantId } });
    }
    if (session.role === "TEACHER") {
      Object.assign(where, { class: { teacherId: session.userId, tenantId: session.tenantId } });
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return json({ attendance });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = attendanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Choose a class, date, and attendance marks.");
    }

    const schoolClass = await getTenantClass(session, parsed.data.classId);
    const results = [];

    for (const mark of parsed.data.marks) {
      const student = await prisma.student.findFirst({
        where: { id: mark.studentId, tenantId: session.tenantId, classId: schoolClass.id },
      });
      if (!student) {
        throw new ApiError("One of the students is not in this class.", 404);
      }

      const row = await prisma.attendance.upsert({
        where: {
          tenantId_studentId_classId_date: {
            tenantId: session.tenantId,
            studentId: student.id,
            classId: schoolClass.id,
            date: parsed.data.date,
          },
        },
        update: { status: mark.status, markedById: session.userId },
        create: {
          tenantId: session.tenantId,
          studentId: student.id,
          classId: schoolClass.id,
          date: parsed.data.date,
          status: mark.status,
          markedById: session.userId,
        },
      });
      results.push(row);
    }

    return json({ attendance: results });
  } catch (err) {
    return handleApiError(err);
  }
}

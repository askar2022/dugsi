import { NextRequest } from "next/server";
import { ApiError, getTenantStudent, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { progressSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const studentId = new URL(request.url).searchParams.get("studentId") ?? undefined;
    const where = {
      ...tenantWhere(session),
      ...(studentId ? { studentId } : {}),
    };

    if (session.role === "PARENT") {
      Object.assign(where, { student: { parentId: session.userId, tenantId: session.tenantId } });
    }
    if (session.role === "TEACHER") {
      Object.assign(where, { student: { class: { teacherId: session.userId } } });
    }

    const progress = await prisma.quranProgress.findMany({
      where,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
    });

    return json({ progress });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = progressSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the student, surah, and ayah range.");
    }

    const student = await getTenantStudent(session, parsed.data.studentId);
    const progress = await prisma.quranProgress.create({
      data: {
        tenantId: session.tenantId,
        studentId: student.id,
        surah: parsed.data.surah,
        ayahFrom: parsed.data.ayahFrom,
        ayahTo: parsed.data.ayahTo,
        juz: parsed.data.juz,
        notes: parsed.data.notes,
        date: parsed.data.date,
        recordedById: session.userId,
      },
    });

    return json({ progress }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

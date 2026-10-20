import { NextRequest } from "next/server";
import { ApiError, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const where = tenantWhere(session);
    if (session.role === "TEACHER") {
      Object.assign(where, { teacherId: session.userId });
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    return json({ classes });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const parsed = classSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter a class name.");
    }

    if (parsed.data.teacherId) {
      const teacher = await prisma.user.findFirst({
        where: {
          id: parsed.data.teacherId,
          tenantId: session.tenantId,
          role: { in: ["TEACHER", "ADMIN", "STAFF"] },
        },
      });
      if (!teacher) {
        throw new ApiError("That teacher is not part of this dugsi.", 404);
      }
    }

    const schoolClass = await prisma.class.create({
      data: {
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
        level: parsed.data.level,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        room: parsed.data.room,
        teacherId: parsed.data.teacherId || null,
      },
    });

    return json({ class: schoolClass }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

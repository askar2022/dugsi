import { NextRequest } from "next/server";
import { ApiError, getTenantClass, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { homeworkSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const where = tenantWhere(session);

    if (session.role === "TEACHER") {
      Object.assign(where, { class: { teacherId: session.userId } });
    }
    if (session.role === "PARENT") {
      Object.assign(where, {
        class: { students: { some: { parentId: session.userId, tenantId: session.tenantId } } },
      });
    }

    const homework = await prisma.homework.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        completions: true,
      },
      orderBy: { assignedDate: "desc" },
    });

    return json({ homework });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER"]);
    const parsed = homeworkSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter a homework title and class.");
    }

    const schoolClass = await getTenantClass(session, parsed.data.classId);
    const homework = await prisma.homework.create({
      data: {
        tenantId: session.tenantId,
        classId: schoolClass.id,
        title: parsed.data.title,
        description: parsed.data.description,
        assignedDate: parsed.data.assignedDate,
        dueDate: parsed.data.dueDate,
        assignedById: session.userId,
      },
    });

    return json({ homework }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

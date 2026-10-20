import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const where = tenantWhere(session);

    if (session.role === "PARENT") {
      Object.assign(where, { parentId: session.userId });
    }
    if (session.role === "TEACHER") {
      Object.assign(where, { class: { teacherId: session.userId } });
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: true,
        parent: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const parsed = studentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the student's first and last name.");
    }

    let parentId: string | undefined;
    if (parsed.data.parentEmail) {
      const email = parsed.data.parentEmail.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { tenantId: session.tenantId, email },
      });
      if (existing) {
        parentId = existing.id;
      } else if (parsed.data.parentName) {
        const parent = await prisma.user.create({
          data: {
            tenantId: session.tenantId,
            email,
            name: parsed.data.parentName,
            phone: parsed.data.parentPhone,
            role: "PARENT",
            passwordHash: await hashPassword("ChangeMe123!"),
            status: "active",
          },
        });
        parentId = parent.id;
      }
    }

    if (parsed.data.classId) {
      const schoolClass = await prisma.class.findFirst({
        where: { id: parsed.data.classId, tenantId: session.tenantId },
      });
      if (!schoolClass) {
        throw new ApiError("That class is not part of this dugsi.", 404);
      }
    }

    const student = await prisma.student.create({
      data: {
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        parentId,
        classId: parsed.data.classId || null,
        notes: parsed.data.notes,
        status: parsed.data.status ?? "enrolled",
      },
      include: { parent: true, class: true },
    });

    if (student.parent?.email) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: student.parent.email,
        subject: `Registration received for ${student.firstName} ${student.lastName}`,
        body: `${student.firstName} has been registered at ${session.tenantName}.`,
        event: "student_enrolled",
      });
    }

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

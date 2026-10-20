import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError, requireRoles } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enrollSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["PARENT"]);
    const parsed = enrollSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter your child's first and last name.");
    }

    const student = await prisma.student.create({
      data: {
        tenantId: session.tenantId,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        notes: parsed.data.notes,
        parentId: session.userId,
        status: "pending",
      },
    });

    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: session.email,
      subject: `Enrollment received for ${student.firstName}`,
      body: `${session.tenantName} received an enrollment request for ${student.firstName} ${student.lastName}. Staff will review it shortly.`,
      event: "student_enrolled",
    });

    const admins = await prisma.user.findMany({
      where: { tenantId: session.tenantId, role: { in: ["ADMIN", "STAFF"] } },
    });
    for (const admin of admins) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: admin.email,
        subject: `New enrollment: ${student.firstName} ${student.lastName}`,
        body: `${session.name} enrolled ${student.firstName} ${student.lastName}.`,
        event: "student_enrolled",
      });
    }

    return json({ student }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/auth";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { staffSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const staff = await prisma.staff.findMany({
      where: tenantWhere(session),
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
      orderBy: { name: "asc" },
    });
    const teachers = await prisma.user.findMany({
      where: { tenantId: session.tenantId, role: "TEACHER" },
      select: { id: true, name: true, email: true, phone: true },
    });
    return json({ staff, teachers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN"]);
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the staff member's name and title.");
    }

    let userId: string | undefined;
    if (parsed.data.createLogin && parsed.data.email && parsed.data.password) {
      const email = parsed.data.email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { tenantId: session.tenantId, email },
      });
      if (existing) {
        throw new ApiError("A login already exists for that email in this dugsi.");
      }
      const user = await prisma.user.create({
        data: {
          tenantId: session.tenantId,
          email,
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: parsed.data.role ?? "TEACHER",
          passwordHash: await hashPassword(parsed.data.password),
          status: "active",
        },
      });
      userId = user.id;
    }

    const staff = await prisma.staff.create({
      data: {
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        title: parsed.data.title,
        startDate: parsed.data.startDate,
        salary: parsed.data.salary,
        notes: parsed.data.notes,
      },
    });

    if (parsed.data.email) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parsed.data.email,
        subject: `Welcome to ${session.tenantName}`,
        body: `You have been added as ${parsed.data.title} at ${session.tenantName}.`,
        event: "staff_onboarded",
      });
    }

    return json({ staff }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

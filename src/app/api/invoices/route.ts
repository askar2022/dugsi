import { NextRequest } from "next/server";
import { computeInvoiceStatus } from "@/lib/billing";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, getTenantStudent, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { invoiceSchema } from "@/lib/validators";

async function refreshLateInvoices(tenantId: string) {
  const open = await prisma.invoice.findMany({
    where: { tenantId, paidDate: null, status: { not: "paid" } },
  });
  for (const invoice of open) {
    const status = computeInvoiceStatus(invoice);
    if (status !== invoice.status) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status } });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "PARENT"]);
    await refreshLateInvoices(session.tenantId);

    const where = tenantWhere(session);
    if (session.role === "PARENT") {
      Object.assign(where, { student: { parentId: session.userId, tenantId: session.tenantId } });
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, parent: { select: { name: true, email: true } } } },
      },
      orderBy: { dueDate: "desc" },
    });

    return json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const parsed = invoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter a student, amount, and due date.");
    }

    const student = await getTenantStudent(session, parsed.data.studentId);
    const status = computeInvoiceStatus({ dueDate: parsed.data.dueDate });

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: session.tenantId,
        studentId: student.id,
        parentId: student.parentId,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate,
        period: parsed.data.period,
        notes: parsed.data.notes,
        status,
      },
      include: { student: { include: { parent: true } } },
    });

    const parentEmail = invoice.student.parent?.email;
    if (parentEmail) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: `Tuition record for ${invoice.student.firstName}`,
        body: `A ${status} tuition record of $${invoice.amount.toFixed(2)} is on file for ${invoice.student.firstName}. This app records billing only and does not take payments.`,
        event: status === "late" ? "invoice_late" : "invoice_created",
      });
    }

    return json({ invoice }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

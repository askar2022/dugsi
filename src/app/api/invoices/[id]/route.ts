import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError, requireRoles } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { student: { include: { parent: true } } },
    });
    if (!invoice) {
      throw new ApiError("Invoice not found in this dugsi.", 404);
    }

    if (body.action === "record-payment") {
      const paidDate = typeof body.paidDate === "string" ? body.paidDate : new Date().toISOString().slice(0, 10);
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidDate, status: "paid" },
        include: { student: { include: { parent: true } } },
      });

      const parentEmail = updated.student.parent?.email;
      if (parentEmail) {
        await sendTenantEmail({
          tenantId: session.tenantId,
          toEmail: parentEmail,
          subject: `Payment recorded for ${updated.student.firstName}`,
          body: `A payment of $${updated.amount.toFixed(2)} was recorded for ${updated.student.firstName}. This is a record only.`,
          event: "invoice_paid",
        });
      }

      return json({ invoice: updated });
    }

    throw new ApiError("Unsupported invoice action.");
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body.action !== "record-payment") {
      throw new ApiError("Unsupported invoice action.");
    }
    const paidDate = typeof body.paidDate === "string" ? body.paidDate : new Date().toISOString().slice(0, 10);
    const { data: invoice, error } = await supabase
      .from("Invoice")
      .update({ paidDate, status: "paid" })
      .eq("id", id)
      .select("*, student:Student(*, parent:User!parentId(*))")
      .single();
    throwIfError(error, "Could not record payment.");
    const parentEmail = invoice?.student?.parent?.email;
    if (parentEmail) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: `Payment recorded for ${invoice.student.firstName}`,
        body: `A payment of $${Number(invoice.amount).toFixed(2)} was recorded. This is a record only.`,
        event: "invoice_paid",
      });
    }
    return json({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { computeInvoiceStatus } from "@/lib/billing";
import { sendTenantEmail } from "@/lib/email";
import { ApiError, getTenantStudent, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { invoiceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF", "PARENT"]);
    const { data: invoices, error } = await supabase
      .from("Invoice")
      .select("*, student:Student(id, firstName, lastName, parent:User!parentId(name, email))")
      .order("dueDate", { ascending: false });
    throwIfError(error, "Could not load invoices.");
    return json({ invoices: invoices ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = invoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter a student, amount, and due date.");
    }
    const { student } = await getTenantStudent(request, parsed.data.studentId);
    const status = computeInvoiceStatus({ dueDate: parsed.data.dueDate });
    const { data: invoice, error } = await supabase
      .from("Invoice")
      .insert({
        tenantId: session.tenantId,
        studentId: student.id,
        parentId: student.parentId,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate,
        period: parsed.data.period,
        notes: parsed.data.notes,
        status,
      })
      .select("*, student:Student(*, parent:User!parentId(*))")
      .single();
    throwIfError(error, "Could not create the billing record.");

    const parentEmail = invoice?.student?.parent?.email;
    if (parentEmail) {
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: parentEmail,
        subject: `Tuition record for ${invoice.student.firstName}`,
        body: `A ${status} tuition record of $${Number(invoice.amount).toFixed(2)} is on file.`,
        event: status === "late" ? "invoice_late" : "invoice_created",
      });
    }

    return json({ invoice }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

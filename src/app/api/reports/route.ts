import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const [students, classes, invoices, expenses, staff, emails] = await Promise.all([
      supabase.from("Student").select("id, status"),
      supabase.from("Class").select("id"),
      supabase.from("Invoice").select("amount, status"),
      supabase.from("Expense").select("amount, category"),
      supabase.from("Staff").select("id"),
      supabase.from("EmailLog").select("id, toEmail, subject, event, createdAt").order("createdAt", { ascending: false }).limit(20),
    ]);
    for (const result of [students, classes, invoices, expenses, staff, emails]) {
      throwIfError(result.error, "Could not load the report.");
    }

    const studentRows = students.data ?? [];
    const invoiceRows = invoices.data ?? [];
    const expenseRows = expenses.data ?? [];
    const expenseTotals = {
      salary: expenseRows.filter((item) => item.category === "salary").reduce((sum, item) => sum + item.amount, 0),
      rent: expenseRows.filter((item) => item.category === "rent").reduce((sum, item) => sum + item.amount, 0),
      equipment: expenseRows.filter((item) => item.category === "equipment").reduce((sum, item) => sum + item.amount, 0),
      other: expenseRows.filter((item) => item.category === "other").reduce((sum, item) => sum + item.amount, 0),
    };

    return json({
      report: {
        students: studentRows.length,
        enrolled: studentRows.filter((item) => item.status === "enrolled").length,
        pending: studentRows.filter((item) => item.status === "pending").length,
        classes: classes.data?.length ?? 0,
        staff: staff.data?.length ?? 0,
        tuition: {
          paid: invoiceRows.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
          due: invoiceRows.filter((item) => item.status === "due").reduce((sum, item) => sum + item.amount, 0),
          late: invoiceRows.filter((item) => item.status === "late").reduce((sum, item) => sum + item.amount, 0),
        },
        expenses: expenseTotals,
        expenseTotal: Object.values(expenseTotals).reduce((sum, value) => sum + value, 0),
        emails: emails.data ?? [],
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

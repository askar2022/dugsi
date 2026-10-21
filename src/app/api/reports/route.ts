import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const admin = createAdminClient();
    const [students, classes, invoices, expenses, staff, progress] = await Promise.all([
      admin.from("Student").select("id, status").eq("tenantId", session.tenantId),
      admin.from("Class").select("id").eq("tenantId", session.tenantId),
      admin.from("Invoice").select("amount, status").eq("tenantId", session.tenantId),
      admin.from("Expense").select("amount, category").eq("tenantId", session.tenantId),
      admin.from("Staff").select("id").eq("tenantId", session.tenantId),
      admin.from("QuranProgress").select("studentId, status, date").eq("tenantId", session.tenantId).order("date", { ascending: false }),
    ]);
    for (const result of [students, classes, invoices, expenses, staff, progress]) {
      throwIfError(result.error, "Could not load the report.");
    }

    const studentRows = students.data ?? [];
    const enrolledIds = new Set(studentRows.filter((item) => item.status === "enrolled").map((item) => item.id));
    const latest = new Map<string, string>();
    for (const item of progress.data ?? []) {
      if (!latest.has(item.studentId)) latest.set(item.studentId, item.status);
    }
    const progressCounts = { on_track: 0, needs_practice: 0, contact_parent: 0, none: 0 };
    for (const student of studentRows) {
      if (student.status === "unenrolled" || student.status === "declined") continue;
      const status = latest.get(student.id);
      if (!status) progressCounts.none += 1;
      else progressCounts[normalizeProgressStatus(status)] += 1;
    }

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
        enrolled: enrolledIds.size,
        pending: studentRows.filter((item) => item.status === "pending").length,
        classes: classes.data?.length ?? 0,
        staff: staff.data?.length ?? 0,
        progress: progressCounts,
        tuition: {
          paid: invoiceRows.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
          due: invoiceRows.filter((item) => item.status === "due").reduce((sum, item) => sum + item.amount, 0),
          late: invoiceRows.filter((item) => item.status === "late").reduce((sum, item) => sum + item.amount, 0),
        },
        expenses: expenseTotals,
        expenseTotal: Object.values(expenseTotals).reduce((sum, value) => sum + value, 0),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from "next/server";
import { handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const where = tenantWhere(session);

    const [students, classes, invoices, expenses, staff, emails] = await Promise.all([
      prisma.student.findMany({ where }),
      prisma.class.findMany({ where, include: { _count: { select: { students: true } } } }),
      prisma.invoice.findMany({ where }),
      prisma.expense.findMany({ where }),
      prisma.staff.findMany({ where }),
      prisma.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const tuition = {
      paid: invoices.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0),
      due: invoices.filter((item) => item.status === "due").reduce((sum, item) => sum + item.amount, 0),
      late: invoices.filter((item) => item.status === "late").reduce((sum, item) => sum + item.amount, 0),
    };

    const expenseTotals = {
      salary: expenses.filter((item) => item.category === "salary").reduce((sum, item) => sum + item.amount, 0),
      rent: expenses.filter((item) => item.category === "rent").reduce((sum, item) => sum + item.amount, 0),
      equipment: expenses.filter((item) => item.category === "equipment").reduce((sum, item) => sum + item.amount, 0),
      other: expenses.filter((item) => item.category === "other").reduce((sum, item) => sum + item.amount, 0),
    };

    return json({
      report: {
        students: students.length,
        enrolled: students.filter((item) => item.status === "enrolled").length,
        pending: students.filter((item) => item.status === "pending").length,
        classes: classes.length,
        staff: staff.length,
        tuition,
        expenses: expenseTotals,
        expenseTotal: Object.values(expenseTotals).reduce((sum, value) => sum + value, 0),
        emails,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

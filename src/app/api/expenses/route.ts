import { NextRequest } from "next/server";
import { ApiError, handleApiError, requireRoles, tenantWhere } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const expenses = await prisma.expense.findMany({
      where: tenantWhere(session),
      orderBy: { date: "desc" },
    });
    return json({ expenses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF"]);
    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter an expense category, amount, and date.");
    }

    if (parsed.data.staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: parsed.data.staffId, tenantId: session.tenantId },
      });
      if (!staff) {
        throw new ApiError("That staff member is not part of this dugsi.", 404);
      }
    }

    const expense = await prisma.expense.create({
      data: {
        tenantId: session.tenantId,
        category: parsed.data.category,
        amount: parsed.data.amount,
        date: parsed.data.date,
        vendor: parsed.data.vendor,
        description: parsed.data.description,
        staffId: parsed.data.staffId,
      },
    });

    return json({ expense }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

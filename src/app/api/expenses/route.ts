import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { expenseSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { data: expenses, error } = await supabase.from("Expense").select("*").order("date", { ascending: false });
    throwIfError(error, "Could not load expenses.");
    return json({ expenses: expenses ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = expenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter an expense category, amount, and date.");
    }
    const { data: expense, error } = await supabase
      .from("Expense")
      .insert({
        tenantId: session.tenantId,
        category: parsed.data.category,
        amount: parsed.data.amount,
        date: parsed.data.date,
        vendor: parsed.data.vendor,
        description: parsed.data.description,
        staffId: parsed.data.staffId,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save the expense.");
    return json({ expense }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

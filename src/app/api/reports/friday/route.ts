import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { sendLeadershipFridayReport } from "@/lib/friday-send";
import { requireAuthedTenant } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const result = await sendLeadershipFridayReport(session.tenantId);
    return json({ report: result });
  } catch (err) {
    return handleApiError(err);
  }
}

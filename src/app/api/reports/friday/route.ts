import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { chicagoNow } from "@/lib/friday-weeks";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const now = chicagoNow();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("EmailLog")
      .select("subject, body, toEmail, createdAt, status")
      .eq("tenantId", session.tenantId)
      .eq("event", "friday_admin")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwIfError(error, "Could not load the Friday report.");
    return json({
      friday: {
        isFriday: now.weekday === "Fri",
        weekday: now.weekday,
        lastSent: data ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

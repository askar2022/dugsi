import { NextRequest } from "next/server";
import { fridayAdminEmail } from "@/lib/friday-emails";
import { loadTenantFridayData } from "@/lib/friday-snapshot";
import { chicagoNow, formatDateRange, fridayWindows, mostRecentFriday } from "@/lib/friday-weeks";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const now = chicagoNow();
    const friday = mostRecentFriday(now.date);
    const { thisWeek, lastWeek } = fridayWindows(friday);
    const weekLabel = formatDateRange(thisWeek.start, thisWeek.end);
    const weekMarker = `Snapshot week ${thisWeek.start}/${thisWeek.end}`;
    const snapshot = await loadTenantFridayData({
      tenantId: session.tenantId,
      thisWeek,
      lastWeek,
      asOf: now.date,
    });
    const preview = fridayAdminEmail({
      schoolName: session.tenantName ?? "Your school",
      adminName: session.name,
      schoolCode: session.tenantSlug,
      weekLabel,
      weekMarker,
      school: snapshot.week,
      preview: true,
    });
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("EmailLog")
      .select("subject, toEmail, createdAt, status")
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
        period: weekLabel,
        preview,
        lastSent: data ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

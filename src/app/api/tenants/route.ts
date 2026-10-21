import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedClient } from "@/lib/supabase/request";

export async function GET(request: NextRequest) {
  try {
    const { session } = await getAuthedClient(request);
    if (session.role !== "PLATFORM") {
      throw new ApiError("Only the platform operator can list all dugsis.", 403);
    }
    const admin = createAdminClient();
    const { data: tenants, error } = await admin
      .from("Tenant")
      .select("*, users:User(id), students:Student(id), classes:Class(id)")
      .order("createdAt", { ascending: false });
    if (error) throw new ApiError(error.message);
    return json({
      tenants: (tenants ?? []).map((tenant) => ({
        ...tenant,
        _count: {
          users: tenant.users?.length ?? 0,
          students: tenant.students?.length ?? 0,
          classes: tenant.classes?.length ?? 0,
        },
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

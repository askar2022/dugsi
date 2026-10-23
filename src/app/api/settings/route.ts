import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { signedSchoolImageUrl } from "@/lib/supabase/school-image";
import { settingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request);
    const first = await supabase
      .from("Tenant")
      .select("id, name, email, phone, address, city, welcomeNote, pageColor")
      .eq("id", session.tenantId)
      .single();
    const tenant =
      first.data ??
      (
        await supabase
          .from("Tenant")
          .select("id, name, email, phone, address, city, welcomeNote")
          .eq("id", session.tenantId)
          .single()
      ).data;
    if (!tenant) {
      throwIfError(first.error, "School not found.");
      throw new ApiError("School not found.");
    }
    const schoolImageUrl = await signedSchoolImageUrl(supabase, session.tenantId);
    return json({
      tenant: { ...tenant, pageColor: "pageColor" in tenant && tenant.pageColor ? tenant.pageColor : "green", schoolImageUrl },
      enrollUrl: session.tenantSlug ? `/s/${session.tenantSlug}` : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN"]);
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Check the school settings and try again.");
    }
    let { data: tenant, error } = await supabase
      .from("Tenant")
      .update(parsed.data)
      .eq("id", session.tenantId)
      .select("*")
      .single();
    if (error && parsed.data.pageColor) {
      const { pageColor: _pageColor, ...rest } = parsed.data;
      const retry = await supabase
        .from("Tenant")
        .update(rest)
        .eq("id", session.tenantId)
        .select("*")
        .single();
      tenant = retry.data;
      error = retry.error;
    }
    throwIfError(error, "Could not save settings.");
    return json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}

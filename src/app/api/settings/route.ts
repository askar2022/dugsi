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
    const { data: me } = await supabase
      .from("User")
      .select("securityEmail")
      .eq("id", session.userId)
      .maybeSingle();
    return json({
      tenant: { ...tenant, pageColor: "pageColor" in tenant && tenant.pageColor ? tenant.pageColor : "green", schoolImageUrl },
      securityEmail: me && "securityEmail" in me ? me.securityEmail ?? "" : "",
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
    const { securityEmail, ...tenantPatch } = parsed.data;
    if (securityEmail) {
      await supabase.from("User").update({ securityEmail: securityEmail.trim().toLowerCase() }).eq("id", session.userId);
    }
    let { data: tenant, error } = await supabase
      .from("Tenant")
      .update(tenantPatch)
      .eq("id", session.tenantId)
      .select("*")
      .single();
    if (error && tenantPatch.pageColor) {
      const { pageColor: _pageColor, ...rest } = tenantPatch;
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

import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { settingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request);
    const { data: tenant, error } = await supabase
      .from("Tenant")
      .select("id, name, slug, email, phone, address, city, welcomeNote")
      .eq("id", session.tenantId)
      .single();
    throwIfError(error, "School not found.");
    return json({ tenant });
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
    const { data: tenant, error } = await supabase
      .from("Tenant")
      .update(parsed.data)
      .eq("id", session.tenantId)
      .select("*")
      .single();
    throwIfError(error, "Could not save settings.");
    return json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}

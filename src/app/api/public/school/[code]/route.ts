import { error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const slug = normalizeSchoolCode(code);
  if (!slug) return error("School not found.", 404);

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("name, city")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return error("School not found.", 404);

  return json({ school: { name: tenant.name, city: tenant.city, code: slug } });
}

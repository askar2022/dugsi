import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedSchoolImageUrl } from "@/lib/supabase/school-image";

export type PublicSchool = {
  name: string;
  city: string | null;
  phone: string | null;
  welcomeNote: string | null;
  code: string;
  imageUrl: string | null;
};

export async function getPublicSchool(code: string): Promise<PublicSchool | null> {
  const slug = normalizeSchoolCode(code);
  if (!slug) return null;
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, name, city, phone, welcomeNote")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return null;
  const imageUrl = await signedSchoolImageUrl(admin, tenant.id);
  return {
    name: tenant.name,
    city: tenant.city,
    phone: tenant.phone,
    welcomeNote: tenant.welcomeNote,
    code: slug,
    imageUrl,
  };
}

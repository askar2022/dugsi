import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedSchoolImageUrl } from "@/lib/supabase/school-image";

export type PublicSchool = {
  name: string;
  city: string | null;
  phone: string | null;
  welcomeNote: string | null;
  pageColor: string;
  code: string;
  imageUrl: string | null;
};

export async function getPublicSchool(code: string): Promise<PublicSchool | null> {
  const slug = normalizeSchoolCode(code);
  if (!slug) return null;
  const admin = createAdminClient();
  const first = await admin
    .from("Tenant")
    .select("id, name, city, phone, welcomeNote, pageColor")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  const tenant =
    first.data ??
    (
      await admin
        .from("Tenant")
        .select("id, name, city, phone, welcomeNote")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle()
    ).data;
  if (!tenant) return null;
  const imageUrl = await signedSchoolImageUrl(admin, tenant.id);
  return {
    name: tenant.name,
    city: tenant.city,
    phone: tenant.phone,
    welcomeNote: tenant.welcomeNote,
    pageColor: "pageColor" in tenant && tenant.pageColor ? String(tenant.pageColor) : "green",
    code: slug,
    imageUrl: imageUrl ?? (slug === "noor" ? "/ourdugsi_LandingPage.png" : null),
  };
}

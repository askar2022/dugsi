import { sendTenantEmail } from "@/lib/email";
import { enrollmentReceivedEmail } from "@/lib/email-messages";
import { error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { parentAuthEmail, resetEmailDestination } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnrollFinishSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = publicEnrollFinishSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter the parent username used on the enrollment form.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const parentEmail = parentAuthEmail(parsed.data.parentEmail, slug);
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return error("School not found.", 404);

  const { data: applications } = await admin
    .from("EnrollmentApplication")
    .select("firstName, lastName, parentName, status")
    .eq("tenantId", tenant.id)
    .eq("parentEmail", parentEmail)
    .in("status", ["pending", "waiting_assessment", "ready_for_class"])
    .order("createdAt", { ascending: true });

  const childNames = (applications ?? [])
    .map((row) => `${row.firstName} ${row.lastName}`.trim())
    .filter(Boolean);
  if (childNames.length === 0) {
    return error("No enrollment was found for that username.", 404);
  }

  const parentName = parsed.data.parentName?.trim() || applications?.[0]?.parentName || null;
  const firstParent = await admin
    .from("User")
    .select("email, securityEmail")
    .eq("tenantId", tenant.id)
    .eq("email", parentEmail)
    .maybeSingle();
  const dest = resetEmailDestination(firstParent.data);
  if (dest) {
    const copy = enrollmentReceivedEmail({
      schoolName: tenant.name,
      parentName,
      childNames,
    });
    await sendTenantEmail({
      tenantId: tenant.id,
      toEmail: dest,
      subject: copy.subject,
      body: copy.body,
      event: "student_enrolled",
    });
  }

  return json({ ok: true, email: dest ?? parentEmail, children: childNames, emailed: Boolean(dest) });
}

import { sendTenantEmail } from "@/lib/email";
import { enrollmentReceivedEmail } from "@/lib/email-messages";
import { error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnrollSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = publicEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter the parent details, the child's age, and check that you agree to the fee and enrollment.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return error("School not found.", 404);

  const extras = {
    guardianName: parsed.data.parentName.trim(),
    guardianEmail: parsed.data.parentEmail.trim().toLowerCase(),
    guardianPhone: parsed.data.parentPhone.trim(),
    address: parsed.data.address.trim(),
    age: parsed.data.age,
    agreedFeeAndEnroll: true,
    notes: parsed.data.notes?.trim() || undefined,
  };

  const row = {
    tenantId: tenant.id,
    parentName: extras.guardianName,
    parentEmail: extras.guardianEmail,
    parentPhone: extras.guardianPhone,
    address: extras.address,
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    age: extras.age,
    gender: parsed.data.gender || null,
    notes: JSON.stringify(extras),
    status: "pending",
  };

  const { error: applicationError } = await admin.from("EnrollmentApplication").insert(row);
  if (applicationError) {
    const { error: withoutColumns } = await admin.from("EnrollmentApplication").insert({
      tenantId: row.tenantId,
      parentName: row.parentName,
      parentEmail: row.parentEmail,
      parentPhone: row.parentPhone,
      firstName: row.firstName,
      lastName: row.lastName,
      notes: JSON.stringify(extras),
      status: "pending",
    });
    if (withoutColumns) {
      const { error: studentError } = await admin.from("Student").insert({
        tenantId: tenant.id,
        firstName: row.firstName,
        lastName: row.lastName,
        notes: JSON.stringify(extras),
        status: "pending",
      });
      if (studentError) {
        return error(studentError.message || "Could not send that application.");
      }
    }
  }

  const copy = enrollmentReceivedEmail({
    schoolName: tenant.name,
    parentName: row.parentName,
    childName: `${row.firstName} ${row.lastName}`,
  });
  await sendTenantEmail({
    tenantId: tenant.id,
    toEmail: row.parentEmail,
    subject: copy.subject,
    body: copy.body,
    event: "student_enrolled",
  });

  return json({ ok: true, schoolName: tenant.name }, 201);
}

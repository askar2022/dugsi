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
    return error("Enter the parent name, parent email, and the child's first and last name.");
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

  const row = {
    tenantId: tenant.id,
    parentName: parsed.data.parentName.trim(),
    parentEmail: parsed.data.parentEmail.trim().toLowerCase(),
    parentPhone: parsed.data.parentPhone || null,
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    dateOfBirth: parsed.data.dateOfBirth || null,
    gender: parsed.data.gender || null,
    notes: parsed.data.notes || null,
    status: "pending",
  };

  const { error: applicationError } = await admin.from("EnrollmentApplication").insert(row);
  if (applicationError) {
    const { error: studentError } = await admin.from("Student").insert({
      tenantId: tenant.id,
      firstName: row.firstName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      notes: JSON.stringify({
        guardianName: row.parentName,
        guardianEmail: row.parentEmail,
        guardianPhone: row.parentPhone,
        notes: row.notes,
      }),
      status: "pending",
    });
    if (studentError) {
      return error(studentError.message || "Could not send that application.");
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

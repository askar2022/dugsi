import { ensureWaitingStudent } from "@/lib/assessment-class";
import { error, json } from "@/lib/http";
import { normalizeSchoolCode } from "@/lib/auth";
import { ensureParentLogin, isDeliverableEmail, saveSecurityEmail } from "@/lib/parent-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnrollSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = publicEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return error("Enter the parent username, password, email, the child's age, and check that you agree to the fee and enrollment.");
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

  const username = parsed.data.parentUsername.trim();
  let parentId: string | null = null;
  let guardianEmail = "";
  try {
    const login = await ensureParentLogin({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      name: parsed.data.parentName.trim(),
      username,
      password: parsed.data.parentPassword,
      phone: parsed.data.parentPhone.trim(),
      requirePassword: true,
    });
    parentId = login.userId;
    guardianEmail = login.email;
    if (isDeliverableEmail(parsed.data.parentEmail)) {
      try {
        await saveSecurityEmail(login.userId, parsed.data.parentEmail);
      } catch {
        // Column may not be pasted yet. The parent can add the email after sign-in.
      }
    }
  } catch (err) {
    return error(err instanceof Error ? err.message : "Could not create that parent login.");
  }

  const extras = {
    guardianName: parsed.data.parentName.trim(),
    guardianEmail,
    guardianUsername: username,
    guardianPhone: parsed.data.parentPhone.trim(),
    address: parsed.data.address.trim(),
    city: parsed.data.city.trim(),
    state: parsed.data.state.trim(),
    zip: parsed.data.zip.trim(),
    age: parsed.data.age,
    agreedFeeAndEnroll: true,
    notes: parsed.data.notes?.trim() || undefined,
  };
  const address = [extras.address, extras.city, extras.state, extras.zip].filter(Boolean).join(", ");
  const notes = JSON.stringify(extras);
  const { studentId } = await ensureWaitingStudent(admin, tenant.id, {
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    age: extras.age,
    address,
    gender: parsed.data.gender || null,
    parentId,
    notes,
  });

  const application = {
    tenantId: tenant.id,
    parentName: extras.guardianName,
    parentEmail: extras.guardianEmail,
    parentPhone: extras.guardianPhone,
    address,
    firstName: parsed.data.firstName.trim(),
    lastName: parsed.data.lastName.trim(),
    age: extras.age,
    gender: parsed.data.gender || null,
    notes,
    studentId,
    status: "waiting_assessment",
  };

  const { error: applicationError } = await admin.from("EnrollmentApplication").insert(application);
  if (applicationError) {
    await admin.from("EnrollmentApplication").insert({
      tenantId: application.tenantId,
      parentName: application.parentName,
      parentEmail: application.parentEmail,
      parentPhone: application.parentPhone,
      firstName: application.firstName,
      lastName: application.lastName,
      notes,
      studentId,
      status: "waiting_assessment",
    });
  }

  return json({ ok: true, schoolName: tenant.name }, 201);
}

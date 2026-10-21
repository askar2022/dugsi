import { sendTenantEmail } from "@/lib/email";
import { progressContactEmail } from "@/lib/email-messages";
import { createAdminClient } from "@/lib/supabase/admin";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function emailParentIfContactNeeded(input: {
  tenantId: string;
  tenantName?: string | null;
  studentId: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  date: string;
  progressId: string;
  status: string;
}) {
  if (input.status !== "contact_parent") return;
  const admin = createAdminClient();
  const { data: student } = await admin
    .from("Student")
    .select("firstName, lastName, parent:User!parentId(name, email)")
    .eq("id", input.studentId)
    .eq("tenantId", input.tenantId)
    .maybeSingle();
  const parent = one(student?.parent);
  if (!parent?.email) return;
  const copy = progressContactEmail({
    schoolName: input.tenantName ?? "your school",
    parentName: parent.name,
    childName: `${student?.firstName ?? "your child"} ${student?.lastName ?? ""}`.trim(),
    surah: input.surah,
    ayahFrom: input.ayahFrom,
    ayahTo: input.ayahTo,
    date: input.date,
    progressId: input.progressId,
  });
  await sendTenantEmail({
    tenantId: input.tenantId,
    toEmail: parent.email,
    subject: copy.subject,
    body: copy.body,
    event: "progress_contact",
  });
}

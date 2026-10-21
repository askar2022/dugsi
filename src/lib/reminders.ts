import { createAdminClient } from "@/lib/supabase/admin";
import { sendTenantEmail } from "@/lib/email";
import { tuitionDueEmail, weekendHomeworkEmail } from "@/lib/email-messages";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function chicagoToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
  };
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

async function alreadySent(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  event: "invoice_late" | "homework_reminder",
  marker: string,
) {
  const { data } = await admin
    .from("EmailLog")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("event", event)
    .ilike("body", `%${marker}%`)
    .limit(1);
  return Boolean(data?.length);
}

export async function runSchoolReminders() {
  const admin = createAdminClient();
  const today = chicagoToday();
  let lateEmails = 0;
  let homeworkEmails = 0;

  const { data: invoices } = await admin
    .from("Invoice")
    .select("id, tenantId, amount, dueDate, status, paidDate, student:Student(firstName, lastName, parent:User!parentId(name, email)), tenant:Tenant(name)")
    .is("paidDate", null)
    .neq("status", "paid");

  for (const invoice of invoices ?? []) {
    if (invoice.dueDate >= today.date) continue;
    if (invoice.status !== "late") {
      await admin.from("Invoice").update({ status: "late" }).eq("id", invoice.id).eq("tenantId", invoice.tenantId);
    }
    const student = one(invoice.student);
    const parent = one(student?.parent);
    const tenant = one(invoice.tenant);
    if (!parent?.email) continue;
    if (await alreadySent(admin, invoice.tenantId, "invoice_late", invoice.id)) continue;
    const copy = tuitionDueEmail({
      schoolName: tenant?.name ?? "your school",
      parentName: parent.name,
      childName: `${student?.firstName ?? "your child"} ${student?.lastName ?? ""}`.trim(),
      amount: Number(invoice.amount),
      dueDate: invoice.dueDate,
      recordId: invoice.id,
    });
    await sendTenantEmail({
      tenantId: invoice.tenantId,
      toEmail: parent.email,
      subject: copy.subject,
      body: copy.body,
      event: "invoice_late",
    });
    lateEmails += 1;
  }

  const friday = today.weekday === "Fri";
  if (friday) {
    const windowEnd = addDays(today.date, 3);
    const { data: homework } = await admin
      .from("Homework")
      .select("id, tenantId, title, dueDate, classId, tenant:Tenant(name), completions:HomeworkCompletion(studentId)")
      .not("dueDate", "is", null)
      .gte("dueDate", today.date)
      .lte("dueDate", windowEnd);

    for (const item of homework ?? []) {
      if (await alreadySent(admin, item.tenantId, "homework_reminder", item.id)) continue;
      const tenant = one(item.tenant);
      const targetedIds = (item.completions ?? []).map((row: { studentId: string }) => row.studentId);
      let studentsQuery = admin
        .from("Student")
        .select("firstName, lastName, parent:User!parentId(name, email)")
        .eq("tenantId", item.tenantId)
        .eq("classId", item.classId);
      if (targetedIds.length) studentsQuery = studentsQuery.in("id", targetedIds);
      const { data: students } = await studentsQuery;

      const sent = new Set<string>();
      for (const student of students ?? []) {
        const parent = one(student.parent);
        const email = parent?.email;
        if (!email || sent.has(email)) continue;
        sent.add(email);
        const copy = weekendHomeworkEmail({
          schoolName: tenant?.name ?? "your school",
          parentName: parent?.name,
          childName: `${student.firstName} ${student.lastName}`.trim(),
          title: item.title,
          dueDate: item.dueDate,
          homeworkId: item.id,
        });
        await sendTenantEmail({
          tenantId: item.tenantId,
          toEmail: email,
          subject: copy.subject,
          body: copy.body,
          event: "homework_reminder",
        });
        homeworkEmails += 1;
      }
    }
  }

  return { lateEmails, homeworkEmails, weekday: today.weekday, date: today.date };
}

import { createAdminClient } from "@/lib/supabase/admin";
import { sendTenantEmail } from "@/lib/email";
import { tuitionDueEmail, weekendHomeworkEmail } from "@/lib/email-messages";

type InvoiceRow = {
  id: string;
  tenantId: string;
  amount: number;
  dueDate: string;
  status: string;
  paidDate: string | null;
  student?: {
    firstName: string;
    lastName: string;
    parent?: { name: string | null; email: string | null } | null;
  } | null;
  tenant?: { name: string } | null;
};

type HomeworkRow = {
  id: string;
  tenantId: string;
  title: string;
  dueDate: string | null;
  classId: string;
  tenant?: { name: string } | null;
};

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

  for (const invoice of (invoices ?? []) as InvoiceRow[]) {
    if (invoice.dueDate >= today.date) continue;
    if (invoice.status !== "late") {
      await admin.from("Invoice").update({ status: "late" }).eq("id", invoice.id).eq("tenantId", invoice.tenantId);
    }
    const parent = invoice.student?.parent;
    if (!parent?.email) continue;
    if (await alreadySent(admin, invoice.tenantId, "invoice_late", invoice.id)) continue;
    const copy = tuitionDueEmail({
      schoolName: invoice.tenant?.name ?? "your school",
      parentName: parent.name,
      childName: `${invoice.student?.firstName ?? "your child"} ${invoice.student?.lastName ?? ""}`.trim(),
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
      .select("id, tenantId, title, dueDate, classId, tenant:Tenant(name)")
      .not("dueDate", "is", null)
      .gte("dueDate", today.date)
      .lte("dueDate", windowEnd);

    for (const item of (homework ?? []) as HomeworkRow[]) {
      if (await alreadySent(admin, item.tenantId, "homework_reminder", item.id)) continue;
      const { data: students } = await admin
        .from("Student")
        .select("firstName, lastName, parent:User!parentId(name, email)")
        .eq("tenantId", item.tenantId)
        .eq("classId", item.classId);

      const sent = new Set<string>();
      for (const student of students ?? []) {
        const parent = Array.isArray(student.parent) ? student.parent[0] : student.parent;
        const email = parent?.email;
        if (!email || sent.has(email)) continue;
        sent.add(email);
        const copy = weekendHomeworkEmail({
          schoolName: item.tenant?.name ?? "your school",
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

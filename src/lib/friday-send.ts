import { sendTenantEmail } from "@/lib/email";
import { fridayAdminEmail, fridayAdminMonthEmail, fridayParentEmail, fridayTeacherEmail } from "@/lib/friday-emails";
import { loadTenantFridayData, type Person } from "@/lib/friday-snapshot";
import { chicagoNow, fridayWindows, isFirstFriday, previousMonth } from "@/lib/friday-weeks";
import { createAdminClient } from "@/lib/supabase/admin";

const NOOR_WATCH: Person = {
  id: "noor-watch",
  name: "Abdimalik",
  email: "aabdimalik@hotmail.com",
};

function adminRecipients(slug: string, admins: Person[]) {
  if (slug !== "noor") return admins;
  if (admins.some((office) => office.email.toLowerCase() === NOOR_WATCH.email)) return admins;
  return [...admins, NOOR_WATCH];
}

async function alreadySent(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  event: "friday_parent" | "friday_teacher" | "friday_admin" | "friday_admin_month",
  toEmail: string,
  marker: string,
) {
  const { data } = await admin
    .from("EmailLog")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("event", event)
    .eq("toEmail", toEmail)
    .ilike("body", `%${marker}%`)
    .limit(1);
  return Boolean(data?.length);
}

export async function runFridaySnapshots(asOf = chicagoNow()) {
  if (asOf.weekday !== "Fri") {
    return { parentEmails: 0, teacherEmails: 0, adminEmails: 0, adminMonthEmails: 0, weekday: asOf.weekday, date: asOf.date };
  }

  const admin = createAdminClient();
  const { thisWeek, lastWeek } = fridayWindows(asOf.date);
  const weekMarker = `Snapshot week ${thisWeek.start}/${thisWeek.end}`;
  const weekLabel = `Week ${thisWeek.start} to ${thisWeek.end}. ${weekMarker}`;
  const sendMonth = isFirstFriday(asOf.date);
  const month = sendMonth ? previousMonth(asOf.date) : null;
  const monthMarker = month ? `Snapshot month ${month.start}` : "";

  const { data: tenants } = await admin.from("Tenant").select("id, name, slug").eq("status", "active");
  let parentEmails = 0;
  let teacherEmails = 0;
  let adminEmails = 0;
  let adminMonthEmails = 0;

  for (const tenant of tenants ?? []) {
    const data = await loadTenantFridayData({
      tenantId: tenant.id,
      thisWeek,
      lastWeek,
      month: month ?? undefined,
      asOf: asOf.date,
    });
    if (!data.week.students) continue;

    for (const parent of data.parents) {
      const children = data.kidsByParent.get(parent.id) ?? [];
      if (!children.length) continue;
      if (await alreadySent(admin, tenant.id, "friday_parent", parent.email, weekMarker)) continue;
      const copy = fridayParentEmail({
        schoolName: tenant.name,
        parentName: parent.name,
        schoolCode: tenant.slug,
        weekLabel,
        children,
      });
      await sendTenantEmail({
        tenantId: tenant.id,
        toEmail: parent.email,
        subject: copy.subject,
        body: copy.body,
        event: "friday_parent",
      });
      parentEmails += 1;
    }

    for (const teacher of data.teachers) {
      const classes = data.classesByTeacher.get(teacher.id) ?? [];
      if (!classes.length) continue;
      if (await alreadySent(admin, tenant.id, "friday_teacher", teacher.email, weekMarker)) continue;
      const copy = fridayTeacherEmail({
        schoolName: tenant.name,
        teacherName: teacher.name,
        schoolCode: tenant.slug,
        weekLabel,
        classes,
      });
      await sendTenantEmail({
        tenantId: tenant.id,
        toEmail: teacher.email,
        subject: copy.subject,
        body: copy.body,
        event: "friday_teacher",
      });
      teacherEmails += 1;
    }

    for (const office of adminRecipients(tenant.slug, data.admins)) {
      if (!(await alreadySent(admin, tenant.id, "friday_admin", office.email, weekMarker))) {
        const copy = fridayAdminEmail({
          schoolName: tenant.name,
          adminName: office.name,
          schoolCode: tenant.slug,
          weekLabel,
          school: data.week,
        });
        await sendTenantEmail({
          tenantId: tenant.id,
          toEmail: office.email,
          subject: copy.subject,
          body: copy.body,
          event: "friday_admin",
        });
        adminEmails += 1;
      }

      if (month && data.month && data.bills && !(await alreadySent(admin, tenant.id, "friday_admin_month", office.email, monthMarker))) {
        const copy = fridayAdminMonthEmail({
          schoolName: tenant.name,
          adminName: office.name,
          schoolCode: tenant.slug,
          monthLabel: month.label,
          monthMarker,
          school: data.month,
          bills: data.bills,
        });
        await sendTenantEmail({
          tenantId: tenant.id,
          toEmail: office.email,
          subject: copy.subject,
          body: copy.body,
          event: "friday_admin_month",
        });
        adminMonthEmails += 1;
      }
    }
  }

  return { parentEmails, teacherEmails, adminEmails, adminMonthEmails, weekday: asOf.weekday, date: asOf.date };
}

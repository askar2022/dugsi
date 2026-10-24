import { getAppUrl } from "@/lib/env";
import { schoolLoginPath } from "@/lib/login-path";
import { ratingLabel, type ClassWeek, type MonthBills, type SchoolWeek, type StudentWeek } from "@/lib/friday-snapshot";

export type FridayEmailCopy = {
  subject: string;
  body: string;
  html: string;
};

function greeting(name?: string | null) {
  return name ? `Assalamu alaikum, ${name}.` : "Assalamu alaikum.";
}

function teacherName(value?: string | null) {
  if (!value || value === "No teacher yet") return "Unassigned";
  return value;
}

function attendText(row: StudentWeek["thisAttend"]) {
  if (!row.recorded) return "No attendance recorded";
  return `${row.present} present, ${row.late} late, ${row.absent} absent`;
}

function workText(row: StudentWeek["thisWork"]) {
  if (!row.assigned) return "No homework recorded";
  return `${row.done} done, ${row.needsHelp} need help`;
}

function placeBlock(child: StudentWeek) {
  if (!child.thisPlace && !child.lastPlace) return "Qur’an: no record yet";
  if (child.thisPlace && child.lastPlace && child.thisPlace === child.lastPlace) {
    return `Qur’an now: ${child.thisPlace} (same as last week)`;
  }
  return `Qur’an now: ${child.thisPlace ?? "no new record"}\nLast week: ${child.lastPlace ?? "no record"}`;
}

function of(part: number, whole: number) {
  return `${part} of ${whole}`;
}

function money(value: number) {
  return `$${value.toFixed(0)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function portalUrl(portal: "admin" | "teacher" | "parent", schoolCode?: string | null) {
  return `${getAppUrl()}${schoolLoginPath(portal, schoolCode)}`;
}

function brandedHtml(input: {
  kicker: string;
  title: string;
  schoolName: string;
  period: string;
  greeting: string;
  intro: string;
  inner: string;
  buttonLabel: string;
  buttonHref: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f7f3eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3eb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="background:#0b3d2e;padding:28px 32px 26px;">
              <p style="margin:0;color:#c4a35a;font-family:Georgia,serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(input.kicker)}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-family:Georgia,serif;font-size:26px;line-height:1.25;">${escapeHtml(input.title)}</h1>
              <p style="margin:10px 0 0;color:#efe7d6;font-family:Georgia,serif;font-size:16px;">${escapeHtml(input.schoolName)}</p>
              <p style="margin:6px 0 0;color:#c4a35a;font-family:Arial,sans-serif;font-size:13px;">${escapeHtml(input.period)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;font-family:Arial,sans-serif;color:#0b3d2e;">
              <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:18px;">${escapeHtml(input.greeting)}</p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#3f4a43;">${escapeHtml(input.intro)}</p>
              ${input.inner}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
                <tr>
                  <td style="background:#0b3d2e;border-radius:999px;">
                    <a href="${escapeHtml(input.buttonHref)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(input.buttonLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;">
              Sent automatically on Friday · Generated securely by OurDugsi · Private school report
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function metricCell(label: string, value: string) {
  return `<td width="33%" style="padding:0 6px 12px;width:33%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3eb;border-radius:12px;">
      <tr>
        <td style="padding:14px 12px;">
          <p style="margin:0;color:#6b7280;font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</p>
          <p style="margin:6px 0 0;color:#0b3d2e;font-family:Georgia,serif;font-size:22px;">${escapeHtml(value)}</p>
        </td>
      </tr>
    </table>
  </td>`;
}

function sectionTitle(title: string) {
  return `<p style="margin:18px 0 8px;color:#0b3d2e;font-family:Georgia,serif;font-size:16px;">${escapeHtml(title)}</p>
  <div style="width:36px;height:2px;background:#c4a35a;margin:0 0 12px;"></div>`;
}

function line(text: string) {
  return `<p style="margin:0 0 6px;color:#3f4a43;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(text)}</p>`;
}

function schoolPulseText(school: SchoolWeek) {
  return [
    `Students: ${school.students}`,
    `Families: ${school.parents}`,
    `Attendance: ${school.presentPct == null ? "no records" : `${school.presentPct}% present`} (${school.present} present, ${school.late} late, ${school.absent} absent)`,
    `Homework: ${school.homeworkAssigned ? `${school.homeworkDone} done, ${school.homeworkHelp} need help` : "no homework recorded"}`,
    `Qur’an moved forward: ${school.moved} students`,
    "",
    "Performance",
    `On Track: ${of(school.onTrack, school.students)}`,
    `Need Practice: ${of(school.attention, school.students)}`,
    `Need Support: ${of(school.support, school.students)}`,
  ];
}

function schoolPulseHtml(school: SchoolWeek) {
  const attendance = school.presentPct == null ? "No records" : `${school.presentPct}%`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${metricCell("Students", String(school.students))}
        ${metricCell("Families", String(school.parents))}
        ${metricCell("Present", attendance)}
      </tr>
    </table>
    ${sectionTitle("This week")}
    ${line(`${school.present} present · ${school.late} late · ${school.absent} absent`)}
    ${line(school.homeworkAssigned ? `${school.homeworkDone} homework done · ${school.homeworkHelp} need help` : "No homework recorded")}
    ${line(`${school.moved} students moved forward in Qur’an`)}
    ${sectionTitle("Performance")}
    ${line(`On Track · ${of(school.onTrack, school.students)}`)}
    ${line(`Need Practice · ${of(school.attention, school.students)}`)}
    ${line(`Need Support · ${of(school.support, school.students)}`)}
  `;
}

function teacherLines(classes: ClassWeek[]) {
  if (!classes.length) return ["No classes yet"];
  return classes.map((klass) => (
    `${teacherName(klass.teacherName)} · ${klass.name} — ${ratingLabel(klass.rating)} (${of(klass.onTrack, klass.students.length)} on track)`
  ));
}

function teacherHtml(classes: ClassWeek[]) {
  if (!classes.length) return line("No classes yet");
  return classes.map((klass) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;background:#f7f3eb;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;color:#0b3d2e;font-family:Georgia,serif;font-size:16px;">${escapeHtml(klass.name)}</p>
          <p style="margin:4px 0 0;color:#6b7280;font-family:Arial,sans-serif;font-size:13px;">${escapeHtml(teacherName(klass.teacherName))}</p>
          <p style="margin:8px 0 0;color:#0b3d2e;font-family:Arial,sans-serif;font-size:14px;">${escapeHtml(ratingLabel(klass.rating))} · ${escapeHtml(of(klass.onTrack, klass.students.length))} on track</p>
        </td>
      </tr>
    </table>
  `).join("");
}

export function fridayParentEmail(input: {
  schoolName: string;
  parentName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  weekMarker?: string;
  children: StudentWeek[];
}): FridayEmailCopy {
  const href = portalUrl("parent", input.schoolCode);
  const blocks = input.children.flatMap((child) => [
    child.name,
    `Attendance this week: ${attendText(child.thisAttend)}`,
    `Attendance last week: ${attendText(child.lastAttend)}`,
    placeBlock(child),
    `Homework this week: ${workText(child.thisWork)}`,
    `Homework last week: ${workText(child.lastWork)}`,
    "",
  ]);
  const inner = input.children.map((child) => `
    ${sectionTitle(child.name)}
    ${line(`Attendance this week: ${attendText(child.thisAttend)}`)}
    ${line(`Attendance last week: ${attendText(child.lastAttend)}`)}
    ${line(placeBlock(child).replace("\n", " · "))}
    ${line(`Homework this week: ${workText(child.thisWork)}`)}
    ${line(`Homework last week: ${workText(child.lastWork)}`)}
  `).join("");
  return {
    subject: `Friday snapshot from ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `Here is this week’s snapshot from ${input.schoolName}.`,
      input.weekLabel,
      "",
      ...blocks,
      `Open your page: ${href}`,
      input.weekMarker ?? "",
    ].filter(Boolean).join("\n"),
    html: brandedHtml({
      kicker: "OurDugsi",
      title: "Friday family snapshot",
      schoolName: input.schoolName,
      period: input.weekLabel,
      greeting: greeting(input.parentName),
      intro: "This is this week compared with last week. It is a snapshot, not a full report.",
      inner,
      buttonLabel: "Open your page",
      buttonHref: href,
    }),
  };
}

export function fridayTeacherEmail(input: {
  schoolName: string;
  teacherName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  weekMarker?: string;
  classes: ClassWeek[];
}): FridayEmailCopy {
  const href = portalUrl("teacher", input.schoolCode);
  const blocks = input.classes.flatMap((klass) => {
    const support = klass.students.filter((kid) => kid.rating === "support_needed");
    return [
      klass.name,
      `Students: ${klass.students.length}`,
      `Attendance: ${klass.present} present, ${klass.late} late, ${klass.absent} absent`,
      `Homework: ${klass.homeworkAssigned ? `${klass.homeworkDone} done, ${klass.homeworkHelp} need help` : "no homework recorded"}`,
      `Qur’an moved forward: ${klass.moved} students`,
      `On Track: ${of(klass.onTrack, klass.students.length)}`,
      `Need Practice: ${of(klass.attention, klass.students.length)}`,
      `Need Support: ${of(klass.support, klass.students.length)}`,
      support.length
        ? `Students who need support:\n${support.map((kid) => `• ${kid.name}`).join("\n")}`
        : "No students need support this week.",
      "",
    ];
  });
  const inner = input.classes.map((klass) => {
    const support = klass.students.filter((kid) => kid.rating === "support_needed");
    return `
      ${sectionTitle(klass.name)}
      ${line(`${klass.students.length} students · ${klass.present} present, ${klass.late} late, ${klass.absent} absent`)}
      ${line(klass.homeworkAssigned ? `${klass.homeworkDone} homework done · ${klass.homeworkHelp} need help` : "No homework recorded")}
      ${line(`${klass.moved} students moved forward in Qur’an`)}
      ${line(`On Track ${of(klass.onTrack, klass.students.length)} · Need Practice ${of(klass.attention, klass.students.length)} · Need Support ${of(klass.support, klass.students.length)}`)}
      ${line(support.length ? `Need support: ${support.map((kid) => kid.name).join(", ")}` : "No students need support this week.")}
    `;
  }).join("");
  return {
    subject: `Friday class snapshot from ${input.schoolName}`,
    body: [
      greeting(input.teacherName),
      "",
      `Well done. Here is this week’s snapshot for your class at ${input.schoolName}.`,
      input.weekLabel,
      "",
      ...blocks,
      `Open your page: ${href}`,
      input.weekMarker ?? "",
    ].filter(Boolean).join("\n"),
    html: brandedHtml({
      kicker: "OurDugsi",
      title: "Friday class snapshot",
      schoolName: input.schoolName,
      period: input.weekLabel,
      greeting: greeting(input.teacherName),
      intro: "Well done. Here is this week’s pulse for your class.",
      inner,
      buttonLabel: "Open your class",
      buttonHref: href,
    }),
  };
}

export function fridayAdminEmail(input: {
  schoolName: string;
  adminName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  weekMarker?: string;
  school: SchoolWeek;
}): FridayEmailCopy {
  const href = portalUrl("admin", input.schoolCode);
  return {
    subject: `Friday leadership snapshot: ${input.schoolName}`,
    body: [
      greeting(input.adminName),
      "",
      `Here is this week’s pulse for ${input.schoolName}.`,
      input.weekLabel,
      "",
      ...schoolPulseText(input.school),
      "",
      "Teachers",
      ...teacherLines(input.school.classes).map((item) => `• ${item}`),
      "",
      `Open your page: ${href}`,
      input.weekMarker ?? "",
    ].filter(Boolean).join("\n"),
    html: brandedHtml({
      kicker: "OurDugsi",
      title: "Weekly Leadership Snapshot",
      schoolName: input.schoolName,
      period: input.weekLabel,
      greeting: greeting(input.adminName),
      intro: "Here is this week’s pulse for your Dugsi. It is a snapshot, not the full report.",
      inner: `${schoolPulseHtml(input.school)}${sectionTitle("Teachers")}${teacherHtml(input.school.classes)}`,
      buttonLabel: "Open your Dugsi",
      buttonHref: href,
    }),
  };
}

export function fridayAdminMonthEmail(input: {
  schoolName: string;
  adminName?: string | null;
  schoolCode?: string | null;
  monthLabel: string;
  monthMarker: string;
  school: SchoolWeek;
  bills: MonthBills;
}): FridayEmailCopy {
  const href = portalUrl("admin", input.schoolCode);
  return {
    subject: `${input.monthLabel} snapshot: ${input.schoolName}`,
    body: [
      greeting(input.adminName),
      "",
      `Here is the ${input.monthLabel} picture for ${input.schoolName}.`,
      "",
      ...schoolPulseText(input.school),
      "",
      "Teachers",
      ...teacherLines(input.school.classes).map((item) => `• ${item}`),
      "",
      "Tuition",
      `Paid: ${input.bills.paidCount} bills · ${money(input.bills.paidAmount)}`,
      `Due: ${input.bills.dueCount} bills · ${money(input.bills.dueAmount)}`,
      `Late: ${input.bills.lateCount} bills · ${money(input.bills.lateAmount)}`,
      "",
      "Please collect tuition at the school. This is a snapshot only.",
      `Open your page: ${href}`,
      input.monthMarker,
    ].join("\n"),
    html: brandedHtml({
      kicker: "OurDugsi",
      title: `${input.monthLabel} snapshot`,
      schoolName: input.schoolName,
      period: input.monthLabel,
      greeting: greeting(input.adminName),
      intro: `Here is the overall ${input.monthLabel} picture for teachers, students, families, and tuition.`,
      inner: `${schoolPulseHtml(input.school)}${sectionTitle("Teachers")}${teacherHtml(input.school.classes)}${sectionTitle("Tuition")}
        ${line(`Paid · ${input.bills.paidCount} bills · ${money(input.bills.paidAmount)}`)}
        ${line(`Due · ${input.bills.dueCount} bills · ${money(input.bills.dueAmount)}`)}
        ${line(`Late · ${input.bills.lateCount} bills · ${money(input.bills.lateAmount)}`)}
        ${line("Please collect tuition at the school. This is a snapshot only.")}`,
      buttonLabel: "Open your Dugsi",
      buttonHref: href,
    }),
  };
}

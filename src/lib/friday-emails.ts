import { getAppUrl } from "@/lib/env";
import { schoolLoginPath } from "@/lib/login-path";
import { ratingLabel, type ClassWeek, type MonthBills, type SchoolWeek, type StudentWeek } from "@/lib/friday-snapshot";

function greeting(name?: string | null) {
  return name ? `Assalamu alaikum, ${name}.` : "Assalamu alaikum.";
}

function attendText(row: StudentWeek["thisAttend"]) {
  if (!row.recorded) return "No attendance recorded";
  return `${row.present} present, ${row.late} late, ${row.absent} absent`;
}

function workText(row: StudentWeek["thisWork"]) {
  if (!row.assigned) return "No homework recorded";
  return `${row.done} done, ${row.needsHelp} needs help (${row.assigned} assigned)`;
}

function placeBlock(child: StudentWeek) {
  if (!child.thisPlace && !child.lastPlace) return "Quran: no record yet";
  if (child.thisPlace && child.lastPlace && child.thisPlace === child.lastPlace) {
    return `Quran now: ${child.thisPlace} (same as last week)`;
  }
  return [
    `Quran now: ${child.thisPlace ?? "no new record"}`,
    `Last week: ${child.lastPlace ?? "no record"}`,
  ].join("\n");
}

function of(part: number, whole: number) {
  return `${part} of ${whole}`;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function schoolPulse(school: SchoolWeek) {
  return [
    `Students: ${school.students}`,
    `Parents: ${school.parents}`,
    `Attendance: ${school.presentPct == null ? "no records" : `${school.presentPct}% present`} (${school.present} present, ${school.late} late, ${school.absent} absent)`,
    `Homework: ${school.homeworkAssigned ? `${school.homeworkDone} done, ${school.homeworkHelp} needs help` : "no homework recorded"}`,
    `Quran moved forward: ${school.moved} students`,
    `On Track: ${of(school.onTrack, school.students)}`,
    `Needs Support: ${of(school.support, school.students)}`,
    `Needs Attention: ${of(school.attention, school.students)}`,
  ];
}

function teacherLines(classes: ClassWeek[]) {
  return classes.map((klass) => {
    const mark = ratingLabel(klass.rating);
    return `- ${klass.teacherName} — ${klass.name} — ${mark} (${of(klass.onTrack, klass.students.length)} on track)`;
  });
}

export function fridayParentEmail(input: {
  schoolName: string;
  parentName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  children: StudentWeek[];
}) {
  const blocks = input.children.flatMap((child) => [
    child.name,
    `Attendance this week: ${attendText(child.thisAttend)}`,
    `Attendance last week: ${attendText(child.lastAttend)}`,
    placeBlock(child),
    `Homework this week: ${workText(child.thisWork)}`,
    `Homework last week: ${workText(child.lastWork)}`,
    "",
  ]);
  return {
    subject: `Friday snapshot from ${input.schoolName}`,
    body: [
      greeting(input.parentName),
      "",
      `This is the Friday snapshot from ${input.schoolName}. It is this week compared with last week, not a full report.`,
      input.weekLabel,
      "",
      ...blocks,
      `Open your page: ${getAppUrl()}${schoolLoginPath("parent", input.schoolCode)}`,
    ].join("\n"),
  };
}

export function fridayTeacherEmail(input: {
  schoolName: string;
  teacherName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  classes: ClassWeek[];
}) {
  const blocks = input.classes.flatMap((klass) => {
    const support = klass.students.filter((kid) => kid.rating === "support_needed");
    return [
      klass.name,
      `Students: ${klass.students.length}`,
      `Attendance: ${klass.present} present, ${klass.late} late, ${klass.absent} absent`,
      `Homework: ${klass.homeworkAssigned ? `${klass.homeworkDone} done, ${klass.homeworkHelp} needs help` : "no homework recorded"}`,
      `Quran moved forward: ${klass.moved} students`,
      `On Track: ${of(klass.onTrack, klass.students.length)}`,
      `Needs Support: ${of(klass.support, klass.students.length)}`,
      `Needs Attention: ${of(klass.attention, klass.students.length)}`,
      support.length
        ? `Students who need support:\n${support.map((kid) => `- ${kid.name}`).join("\n")}`
        : "No students need support this week.",
      "",
    ];
  });
  return {
    subject: `Friday class snapshot from ${input.schoolName}`,
    body: [
      greeting(input.teacherName),
      "",
      `Well done. Here is this week’s snapshot for your class at ${input.schoolName}.`,
      input.weekLabel,
      "",
      ...blocks,
      `Open your page: ${getAppUrl()}${schoolLoginPath("teacher", input.schoolCode)}`,
    ].join("\n"),
  };
}

export function fridayAdminEmail(input: {
  schoolName: string;
  adminName?: string | null;
  schoolCode?: string | null;
  weekLabel: string;
  school: SchoolWeek;
}) {
  return {
    subject: `Friday Dugsi snapshot: ${input.schoolName}`,
    body: [
      greeting(input.adminName),
      "",
      `Friday snapshot for ${input.schoolName}. This is the weekly pulse, not the full report.`,
      input.weekLabel,
      "",
      ...schoolPulse(input.school),
      "",
      "Teachers",
      ...(input.school.classes.length ? teacherLines(input.school.classes) : ["- No classes yet"]),
      "",
      `Open your page: ${getAppUrl()}${schoolLoginPath("admin", input.schoolCode)}`,
    ].join("\n"),
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
}) {
  return {
    subject: `${input.monthLabel} snapshot: ${input.schoolName}`,
    body: [
      greeting(input.adminName),
      "",
      `Month snapshot for ${input.schoolName}. This is the overall ${input.monthLabel} picture for teachers, students, parents, and tuition.`,
      input.monthMarker,
      "",
      ...schoolPulse(input.school),
      "",
      "Teachers",
      ...(input.school.classes.length ? teacherLines(input.school.classes) : ["- No classes yet"]),
      "",
      "Tuition",
      `Paid: ${input.bills.paidCount} bills · ${money(input.bills.paidAmount)}`,
      `Due: ${input.bills.dueCount} bills · ${money(input.bills.dueAmount)}`,
      `Late: ${input.bills.lateCount} bills · ${money(input.bills.lateAmount)}`,
      "",
      "Please collect tuition at the school. This is a snapshot only. We do not take card payments in the app.",
      "",
      `Open your page: ${getAppUrl()}${schoolLoginPath("admin", input.schoolCode)}`,
    ].join("\n"),
  };
}

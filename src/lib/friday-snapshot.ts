import { ASSESSMENT_CLASS_LEVEL, ASSESSMENT_CLASS_NAME } from "@/lib/assessment-class";
import {
  attendanceScore,
  average,
  CLASS_RATING_LABELS,
  completionFollowedUp,
  homeworkAssignedToStudent,
  homeworkFollowUp,
  inWindow,
  percent,
  quranOwnGoalScore,
  ratingFromScore,
  type RatingKey,
} from "@/lib/performance";
import { isNewCoverage, placeLabel, sortProgress, type ProgressPlace } from "@/lib/progress-compare";
import { createAdminClient } from "@/lib/supabase/admin";

export type DateRange = { start: string; end: string };

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  parentId: string | null;
  classId: string | null;
};

type HomeworkRow = {
  id: string;
  classId: string;
  studentId?: string | null;
  assignedDate: string;
  completions: Array<{ studentId: string; status: string }> | null;
};

type InvoiceRow = {
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
};

export type StudentWeek = {
  id: string;
  name: string;
  parentId: string | null;
  classId: string | null;
  thisAttend: ReturnType<typeof attendanceScore>;
  lastAttend: ReturnType<typeof attendanceScore>;
  thisWork: { assigned: number; done: number; needsHelp: number };
  lastWork: { assigned: number; done: number; needsHelp: number };
  thisPlace: string | null;
  lastPlace: string | null;
  moved: boolean;
  rating: RatingKey | "none";
};

export type ClassWeek = {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string;
  students: StudentWeek[];
  onTrack: number;
  attention: number;
  support: number;
  rating: RatingKey | "none";
  present: number;
  late: number;
  absent: number;
  homeworkDone: number;
  homeworkHelp: number;
  homeworkAssigned: number;
  moved: number;
};

export type SchoolWeek = {
  students: number;
  parents: number;
  presentPct: number | null;
  present: number;
  late: number;
  absent: number;
  homeworkDone: number;
  homeworkHelp: number;
  homeworkAssigned: number;
  moved: number;
  onTrack: number;
  attention: number;
  support: number;
  rating: RatingKey | "none";
  classes: ClassWeek[];
};

export type MonthBills = {
  paidCount: number;
  paidAmount: number;
  dueCount: number;
  dueAmount: number;
  lateCount: number;
  lateAmount: number;
};

export type Person = { id: string; name: string; email: string };

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function workCounts(homework: HomeworkRow[], student: StudentRow, range: DateRange) {
  const assigned = homework.filter(
    (item) => inWindow(item.assignedDate, range.start, range.end) && homeworkAssignedToStudent(item, student),
  );
  const done = assigned.filter((item) =>
    (item.completions ?? []).some((row) => row.studentId === student.id && row.status === "done"),
  ).length;
  const needsHelp = assigned.filter((item) =>
    (item.completions ?? []).some((row) => row.studentId === student.id && row.status === "needs_help"),
  ).length;
  return { assigned: assigned.length, done, needsHelp };
}

function placeAt(records: ProgressPlace[], end: string) {
  const latest = sortProgress(records).find((item) => item.date <= end);
  return latest ? placeLabel(latest) : null;
}

function movedIn(records: ProgressPlace[], range: DateRange) {
  const history = sortProgress(records);
  const latest = history.find((item) => inWindow(item.date, range.start, range.end));
  if (!latest) return false;
  const before = history.find((item) => item.date < range.start);
  if (!before) return true;
  return isNewCoverage(before, latest);
}

function studentWeek(
  student: StudentRow,
  range: DateRange,
  lastRange: DateRange,
  progress: ProgressPlace[],
  marks: Array<{ date: string; status: string }>,
  homework: HomeworkRow[],
): StudentWeek {
  const thisAttend = attendanceScore(marks.filter((row) => inWindow(row.date, range.start, range.end)));
  const lastAttend = attendanceScore(marks.filter((row) => inWindow(row.date, lastRange.start, lastRange.end)));
  const thisWork = workCounts(homework, student, range);
  const lastWork = workCounts(homework, student, lastRange);
  const quran = quranOwnGoalScore(progress, range.start, range.end, false);
  const work = homeworkFollowUp(
    thisWork.assigned,
    homework.filter(
      (item) =>
        inWindow(item.assignedDate, range.start, range.end) &&
        homeworkAssignedToStudent(item, student) &&
        (item.completions ?? []).some((row) => row.studentId === student.id && completionFollowedUp(row.status)),
    ).length,
    thisWork.done,
  );
  const score = average([quran, thisAttend.score, work.score]);
  return {
    id: student.id,
    name: `${student.firstName} ${student.lastName}`.trim(),
    parentId: student.parentId,
    classId: student.classId,
    thisAttend,
    lastAttend,
    thisWork,
    lastWork,
    thisPlace: placeAt(progress, range.end),
    lastPlace: placeAt(progress, lastRange.end),
    moved: movedIn(progress, range),
    rating: ratingFromScore(score),
  };
}

function rollClass(klass: { id: string; name: string; teacherId: string | null; teacherName: string }, kids: StudentWeek[]): ClassWeek {
  const rated = kids.filter((kid) => kid.rating !== "none");
  const onTrack = rated.filter((kid) => kid.rating === "on_track").length;
  const support = rated.filter((kid) => kid.rating === "support_needed").length;
  const attention = Math.max(0, kids.length - onTrack - support);
  return {
    id: klass.id,
    name: klass.name,
    teacherId: klass.teacherId,
    teacherName: klass.teacherName,
    students: kids,
    onTrack,
    attention,
    support,
    rating: ratingFromScore(percent(onTrack, kids.length)),
    present: kids.reduce((sum, kid) => sum + kid.thisAttend.present, 0),
    late: kids.reduce((sum, kid) => sum + kid.thisAttend.late, 0),
    absent: kids.reduce((sum, kid) => sum + kid.thisAttend.absent, 0),
    homeworkDone: kids.reduce((sum, kid) => sum + kid.thisWork.done, 0),
    homeworkHelp: kids.reduce((sum, kid) => sum + kid.thisWork.needsHelp, 0),
    homeworkAssigned: kids.reduce((sum, kid) => sum + kid.thisWork.assigned, 0),
    moved: kids.filter((kid) => kid.moved).length,
  };
}

function rollSchool(classes: ClassWeek[], parentCount: number): SchoolWeek {
  const students = classes.reduce((sum, item) => sum + item.students.length, 0);
  const onTrack = classes.reduce((sum, item) => sum + item.onTrack, 0);
  const present = classes.reduce((sum, item) => sum + item.present, 0);
  const late = classes.reduce((sum, item) => sum + item.late, 0);
  const absent = classes.reduce((sum, item) => sum + item.absent, 0);
  const marked = present + late + absent;
  return {
    students,
    parents: parentCount,
    presentPct: percent(present, marked),
    present,
    late,
    absent,
    homeworkDone: classes.reduce((sum, item) => sum + item.homeworkDone, 0),
    homeworkHelp: classes.reduce((sum, item) => sum + item.homeworkHelp, 0),
    homeworkAssigned: classes.reduce((sum, item) => sum + item.homeworkAssigned, 0),
    moved: classes.reduce((sum, item) => sum + item.moved, 0),
    onTrack,
    attention: classes.reduce((sum, item) => sum + item.attention, 0),
    support: classes.reduce((sum, item) => sum + item.support, 0),
    rating: ratingFromScore(percent(onTrack, students)),
    classes,
  };
}

function billBucket(invoice: InvoiceRow, asOf: string): keyof Pick<MonthBills, "paidCount" | "dueCount" | "lateCount"> {
  if (invoice.paidDate || invoice.status === "paid") return "paidCount";
  if (invoice.status === "late" || invoice.dueDate < asOf) return "lateCount";
  return "dueCount";
}

export function billsForMonth(invoices: InvoiceRow[], month: DateRange, asOf: string): MonthBills {
  const bills: MonthBills = {
    paidCount: 0,
    paidAmount: 0,
    dueCount: 0,
    dueAmount: 0,
    lateCount: 0,
    lateAmount: 0,
  };
  for (const invoice of invoices) {
    if (!inWindow(invoice.dueDate, month.start, month.end)) continue;
    const amount = Number(invoice.amount) || 0;
    const bucket = billBucket(invoice, asOf);
    if (bucket === "paidCount") {
      bills.paidCount += 1;
      bills.paidAmount += amount;
    } else if (bucket === "lateCount") {
      bills.lateCount += 1;
      bills.lateAmount += amount;
    } else {
      bills.dueCount += 1;
      bills.dueAmount += amount;
    }
  }
  return bills;
}

export function ratingLabel(rating: RatingKey | "none") {
  if (rating === "none") return "No record yet";
  return CLASS_RATING_LABELS[rating];
}

export async function loadTenantFridayData(input: {
  tenantId: string;
  thisWeek: DateRange;
  lastWeek: DateRange;
  month?: DateRange;
  asOf: string;
}) {
  const admin = createAdminClient();
  const from = input.month && input.month.start < input.lastWeek.start ? input.month.start : input.lastWeek.start;
  const [studentsRes, classesRes, progressRes, attendanceRes, homeworkRes, usersRes, invoicesRes] = await Promise.all([
    admin.from("Student").select("id, firstName, lastName, status, parentId, classId").eq("tenantId", input.tenantId),
    admin.from("Class").select("id, name, level, teacherId, teacher:User!teacherId(id, name)").eq("tenantId", input.tenantId),
    admin.from("QuranProgress").select("id, studentId, surah, ayahFrom, ayahTo, juz, date, status").eq("tenantId", input.tenantId),
    admin.from("Attendance").select("studentId, date, status").eq("tenantId", input.tenantId).gte("date", from).lte("date", input.asOf),
    admin
      .from("Homework")
      .select("id, classId, studentId, assignedDate, completions:HomeworkCompletion(studentId, status)")
      .eq("tenantId", input.tenantId)
      .gte("assignedDate", from)
      .lte("assignedDate", input.asOf),
    admin.from("User").select("id, name, email, role, status").eq("tenantId", input.tenantId).eq("status", "active"),
    input.month
      ? admin
          .from("Invoice")
          .select("amount, dueDate, paidDate, status")
          .eq("tenantId", input.tenantId)
          .gte("dueDate", input.month.start)
          .lte("dueDate", input.month.end)
      : Promise.resolve({ data: [] as InvoiceRow[], error: null }),
  ]);

  const holdingIds = new Set(
    (classesRes.data ?? [])
      .filter((item) => item.level === ASSESSMENT_CLASS_LEVEL || item.name === ASSESSMENT_CLASS_NAME)
      .map((item) => item.id),
  );
  const students = ((studentsRes.data ?? []) as StudentRow[]).filter(
    (student) => student.status === "enrolled" && student.classId && !holdingIds.has(student.classId),
  );
  const classes = (classesRes.data ?? []).filter((item) => !holdingIds.has(item.id));
  const homework = (homeworkRes.data ?? []) as HomeworkRow[];
  const people = (usersRes.data ?? []).filter((user) => user.email) as Array<Person & { role: string }>;

  const progressByStudent = new Map<string, ProgressPlace[]>();
  for (const row of progressRes.data ?? []) {
    const list = progressByStudent.get(row.studentId) ?? [];
    list.push(row);
    progressByStudent.set(row.studentId, list);
  }
  const marksByStudent = new Map<string, Array<{ date: string; status: string }>>();
  for (const row of attendanceRes.data ?? []) {
    const list = marksByStudent.get(row.studentId) ?? [];
    list.push(row);
    marksByStudent.set(row.studentId, list);
  }

  const weeks = students.map((student) =>
    studentWeek(
      student,
      input.thisWeek,
      input.lastWeek,
      progressByStudent.get(student.id) ?? [],
      marksByStudent.get(student.id) ?? [],
      homework,
    ),
  );

  const classWeeks = classes.map((klass) => {
    const teacher = one(klass.teacher);
    return rollClass(
      {
        id: klass.id,
        name: klass.name,
        teacherId: klass.teacherId,
        teacherName: teacher?.name ?? "No teacher yet",
      },
      weeks.filter((kid) => kid.classId === klass.id),
    );
  });

  const parentIds = new Set(weeks.map((kid) => kid.parentId).filter((id): id is string => Boolean(id)));
  const week = rollSchool(classWeeks, parentIds.size);
  const monthKids = input.month
    ? students.map((student) =>
        studentWeek(
          student,
          input.month!,
          input.lastWeek,
          progressByStudent.get(student.id) ?? [],
          marksByStudent.get(student.id) ?? [],
          homework,
        ),
      )
    : [];
  const month = input.month
    ? rollSchool(
        classes.map((klass) => {
          const teacher = one(klass.teacher);
          return rollClass(
            {
              id: klass.id,
              name: klass.name,
              teacherId: klass.teacherId,
              teacherName: teacher?.name ?? "No teacher yet",
            },
            monthKids.filter((kid) => kid.classId === klass.id),
          );
        }),
        parentIds.size,
      )
    : null;

  return {
    week,
    month,
    bills: input.month ? billsForMonth((invoicesRes.data ?? []) as InvoiceRow[], input.month, input.asOf) : null,
    parents: people.filter((user) => user.role === "PARENT"),
    teachers: people.filter((user) => user.role === "TEACHER"),
    admins: people.filter((user) => user.role === "ADMIN"),
    kidsByParent: new Map(
      [...parentIds].map((id) => [id, weeks.filter((kid) => kid.parentId === id)] as const),
    ),
    classesByTeacher: new Map(
      classWeeks
        .filter((item) => item.teacherId)
        .reduce((map, item) => {
          const list = map.get(item.teacherId!) ?? [];
          list.push(item);
          map.set(item.teacherId!, list);
          return map;
        }, new Map<string, ClassWeek[]>()),
    ),
  };
}

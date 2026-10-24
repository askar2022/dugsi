"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel, isAssessmentClass, needsClassPlacement } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { homeworkAssignedToStudent } from "@/lib/performance";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { quranPortion } from "@/lib/quran";
import type { Session } from "@/lib/types";

type SchoolClass = { id: string; name: string; level?: string | null; dayOfWeek?: string | null };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId?: string | null;
  createdAt?: string | null;
  class?: SchoolClass | SchoolClass[] | null;
};
type Attendance = { id?: string; studentId: string; classId?: string; status: string; date: string; createdAt?: string };
type Progress = {
  id?: string;
  studentId?: string;
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz?: number | null;
  date: string;
  status?: string | null;
  createdAt?: string;
  student?: { id?: string; firstName?: string; lastName?: string } | { id?: string }[] | null;
};
type Invoice = {
  id: string;
  amount: number;
  status: string;
  paidDate?: string | null;
  dueDate?: string | null;
  updatedAt?: string | null;
  student?: { id?: string; firstName?: string; lastName?: string } | { id?: string; firstName?: string; lastName?: string }[] | null;
};
type Homework = {
  id: string;
  title: string;
  dueDate?: string | null;
  classId: string;
  studentId?: string | null;
  completions?: Array<{ studentId: string; status: string; updatedAt?: string | null }>;
};
type Attention = { id: string; name: string; reason: string; href: string; tone: string };
type Activity = { id: string; text: string; meta: string; href: string; at: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function studentName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`;
}

function classOf(student: Student) {
  return one(student.class);
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatShortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function latestProgress(progress: Progress[], studentId: string) {
  return progress.find((item) => item.studentId === studentId || one(item.student)?.id === studentId) ?? null;
}

function isEnrolled(student: Student, holdingId: string | null) {
  return student.status === "enrolled" && Boolean(student.classId) && student.classId !== holdingId && !isAssessmentClass(classOf(student));
}

export default function AdminHomePage() {
  const router = useRouter();
  const searchBox = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<Session | null>(null);
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ user: Session }>("/api/auth/me"),
      api<{ tenant: { schoolImageUrl: string | null } }>("/api/settings").catch(() => ({ tenant: { schoolImageUrl: null } })),
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
      api<{ progress: Progress[] }>("/api/progress"),
      api<{ invoices: Invoice[] }>("/api/invoices"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]).then(([me, settings, studentData, classData, attendanceData, progressData, invoiceData, homeworkData]) => {
      setUser(me.user);
      setSchoolImageUrl(settings.tenant.schoolImageUrl);
      setStudents(studentData.students);
      setClasses(classData.classes);
      setAttendance(attendanceData.attendance);
      setProgress(progressData.progress);
      setInvoices(invoiceData.invoices);
      setHomework(homeworkData.homework);
    }).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!searchBox.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  const asOf = todayIso();
  const windowStart = addDays(asOf, -27);
  const weekday = WEEKDAYS[new Date(`${asOf}T12:00:00`).getDay()];

  const holdingId = useMemo(
    () => classes.find((item) => isAssessmentClass(item))?.id ?? null,
    [classes],
  );
  const roster = useMemo(
    () => students.filter((student) => isEnrolled(student, holdingId)),
    [holdingId, students],
  );
  const waiting = useMemo(
    () => students.filter((student) => needsClassPlacement({ ...student, class: classOf(student) }, holdingId)),
    [holdingId, students],
  );
  const searchable = useMemo(
    () => students.filter((student) => student.status !== "unenrolled" && student.status !== "declined"),
    [students],
  );
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return searchable
      .filter((student) => {
        const klass = classPlaceLabel({ status: student.status, class: classOf(student) });
        return `${studentName(student)} ${klass}`.toLowerCase().includes(needle);
      })
      .slice(0, 8);
  }, [query, searchable]);
  const realClasses = useMemo(
    () => classes.filter((item) => !isAssessmentClass(item)),
    [classes],
  );
  const unpaid = useMemo(
    () => invoices.filter((item) => item.status === "due" || item.status === "late"),
    [invoices],
  );

  const glance = useMemo(() => {
    const todayClasses = realClasses.filter((item) => (item.dayOfWeek ?? "").toLowerCase() === weekday.toLowerCase());
    const todayRoster = todayClasses.length
      ? roster.filter((student) => todayClasses.some((klass) => klass.id === (student.classId ?? classOf(student)?.id)))
      : [];
    const todayMarks = attendance.filter((row) => row.date === asOf);
    const markedToday = todayRoster.filter((student) => todayMarks.some((row) => row.studentId === student.id)).length;
    const attendanceValue = todayClasses.length === 0
      ? "No class"
      : markedToday === 0
        ? "Not marked"
        : `${markedToday}/${todayRoster.length}`;

    const needSupport = roster.filter((student) =>
      normalizeProgressStatus(latestProgress(progress, student.id)?.status) === "contact_parent",
    ).length;

    const belowTarget = realClasses.filter((klass) => {
      const kids = roster.filter((student) => (student.classId ?? classOf(student)?.id) === klass.id);
      if (!kids.length) return false;
      const onTrack = kids.filter((student) =>
        normalizeProgressStatus(latestProgress(progress, student.id)?.status) === "on_track",
      ).length;
      return Math.round((onTrack / kids.length) * 100) < 80;
    }).length;

    return [
      { label: "Total Students", value: roster.length, href: "/admin/students", tone: "is-on" },
      { label: "Attendance Today", value: attendanceValue, href: "/admin/attendance", tone: attendanceValue === "Not marked" ? "is-attention" : "is-on" },
      { label: "Tuition Due", value: money(unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0)), href: "/admin/billing", tone: unpaid.length ? "is-attention" : "is-on" },
      { label: "Students Needing Support", value: needSupport, href: "/admin/progress", tone: needSupport ? "is-support" : "is-on" },
      { label: "New Enrollments", value: waiting.length, href: "/admin/enrollment", tone: waiting.length ? "is-attention" : "is-on" },
      { label: "Classes Below Target", value: belowTarget, href: "/admin/performance", tone: belowTarget ? "is-support" : "is-on" },
    ];
  }, [asOf, attendance, progress, realClasses, roster, unpaid, waiting.length, weekday]);

  const needsAttention = useMemo(() => {
    const rows: Attention[] = [];

    for (const invoice of unpaid.slice(0, 6)) {
      const student = one(invoice.student);
      const name = student?.firstName && student.lastName ? studentName({ firstName: student.firstName, lastName: student.lastName }) : "Tuition";
      rows.push({
        id: `bill-${invoice.id}`,
        name,
        reason: invoice.status === "late" ? `Unpaid tuition · late ${money(Number(invoice.amount || 0))}` : `Unpaid tuition · ${money(Number(invoice.amount || 0))} due`,
        href: "/admin/billing",
        tone: invoice.status === "late" ? "late" : "due",
      });
    }

    for (const student of roster) {
      const tone = normalizeProgressStatus(latestProgress(progress, student.id)?.status);
      if (tone === "needs_practice" || tone === "contact_parent") {
        rows.push({
          id: `${student.id}-behind`,
          name: studentName(student),
          reason: tone === "contact_parent" ? "Falling behind · needs support" : "Falling behind · needs practice",
          href: `/admin/students/${student.id}?from=overview`,
          tone,
        });
      }
    }

    const todayClasses = realClasses.filter((item) => (item.dayOfWeek ?? "").toLowerCase() === weekday.toLowerCase());
    for (const klass of todayClasses) {
      const kids = roster.filter((student) => (student.classId ?? classOf(student)?.id) === klass.id);
      const marked = kids.filter((student) => attendance.some((row) => row.studentId === student.id && row.date === asOf));
      if (kids.length && marked.length === 0) {
        rows.push({
          id: `attend-${klass.id}`,
          name: klass.name,
          reason: "Missing attendance today",
          href: "/admin/attendance",
          tone: "absent",
        });
      }
    }
    if (todayClasses.length === 0) {
      for (const klass of realClasses) {
        const kids = roster.filter((student) => (student.classId ?? classOf(student)?.id) === klass.id);
        const lastDay = [...new Set(attendance.filter((row) => row.classId === klass.id).map((row) => row.date))].sort().at(-1);
        if (kids.length && !lastDay) {
          rows.push({
            id: `attend-${klass.id}`,
            name: klass.name,
            reason: "Missing attendance",
            href: "/admin/attendance",
            tone: "absent",
          });
        }
      }
    }

    for (const student of roster) {
      const lateCount = attendance.filter((row) => row.studentId === student.id && row.date >= windowStart && row.status === "late").length;
      if (lateCount >= 2) {
        rows.push({
          id: `${student.id}-late`,
          name: studentName(student),
          reason: `${lateCount} late arrivals this month`,
          href: `/admin/students/${student.id}?from=overview`,
          tone: "late",
        });
      }
      const incomplete = homework.some((item) => {
        if (!homeworkAssignedToStudent(item, student)) return false;
        const status = item.completions?.find((row) => row.studentId === student.id)?.status ?? "assigned";
        const overdue = Boolean(item.dueDate && item.dueDate < asOf && status === "assigned");
        return status === "needs_help" || overdue;
      });
      if (incomplete) {
        rows.push({
          id: `${student.id}-hw`,
          name: studentName(student),
          reason: "Incomplete homework",
          href: `/admin/students/${student.id}?from=overview`,
          tone: "needs_help",
        });
      }
    }

    return rows.slice(0, 10);
  }, [asOf, attendance, homework, progress, realClasses, roster, unpaid, weekday, windowStart]);

  const recentActivity = useMemo(() => {
    const rows: Activity[] = [];

    for (const student of students) {
      if (!student.createdAt || student.createdAt.slice(0, 10) < windowStart) continue;
      if (student.status === "declined" || student.status === "unenrolled") continue;
      rows.push({
        id: `enroll-${student.id}`,
        text: `${studentName(student)} enrolled`,
        meta: classOf(student)?.name || "New student",
        href: `/admin/students/${student.id}?from=overview`,
        at: student.createdAt,
      });
    }

    for (const invoice of invoices) {
      if (invoice.status !== "paid" || !invoice.paidDate) continue;
      const student = one(invoice.student);
      const paidName = student?.firstName && student.lastName ? studentName({ firstName: student.firstName, lastName: student.lastName }) : "";
      rows.push({
        id: `pay-${invoice.id}`,
        text: `Payment received${paidName ? ` · ${paidName}` : ""}`,
        meta: `${money(Number(invoice.amount || 0))}${invoice.paidDate ? ` · ${formatShortDate(invoice.paidDate)}` : ""}`,
        href: "/admin/billing",
        at: invoice.paidDate,
      });
    }

    const seenProgress = new Set<string>();
    for (const item of progress) {
      const student = roster.find((row) => row.id === item.studentId || row.id === one(item.student)?.id);
      if (!student || seenProgress.has(student.id)) continue;
      seenProgress.add(student.id);
      rows.push({
        id: `progress-${item.id ?? item.studentId}-${item.date}`,
        text: `Teacher updated progress · ${studentName(student)}`,
        meta: quranPortion(item) || item.surah,
        href: `/admin/students/${student.id}?from=overview`,
        at: item.createdAt || `${item.date}T12:00:00`,
      });
    }

    for (const klass of realClasses) {
      const kids = roster.filter((student) => (student.classId ?? classOf(student)?.id) === klass.id);
      if (!kids.length) continue;
      const dates = [...new Set(attendance.filter((row) => row.classId === klass.id).map((row) => row.date))];
      for (const date of dates) {
        const marked = kids.filter((student) => attendance.some((row) => row.studentId === student.id && row.date === date));
        if (marked.length < kids.length) continue;
        rows.push({
          id: `class-attend-${klass.id}-${date}`,
          text: `${klass.name} attendance completed`,
          meta: formatShortDate(date),
          href: "/admin/attendance",
          at: `${date}T18:00:00`,
        });
      }
    }

    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  }, [attendance, invoices, progress, realClasses, roster, students, windowStart]);

  const needle = query.trim().toLowerCase();
  const visibleAttention = needle
    ? needsAttention.filter((item) => `${item.name} ${item.reason}`.toLowerCase().includes(needle))
    : needsAttention;
  const visibleActivity = needle
    ? recentActivity.filter((item) => `${item.text} ${item.meta}`.toLowerCase().includes(needle))
    : recentActivity;

  function openStudent(id: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(`/admin/students/${id}?from=overview`);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (matches[0]) openStudent(matches[0].id);
  }

  return (
    <div className="page-stack">
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Dugsi Management</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Here is how the school looks today.
          </p>
        </div>
        <div className="hero-art">
          <SchoolImage src={schoolImageUrl} name={user?.tenantName} alt="" />
        </div>
      </section>

      <div className="teacher-search admin-search" ref={searchBox}>
        <form onSubmit={onSearch}>
          <input
            className="input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search a student, class, or alert..."
            autoComplete="off"
          />
        </form>
        {searchOpen && query.trim() ? (
          <div className="student-picker-menu">
            <div className="student-picker-list">
              {matches.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="student-pick"
                  onClick={() => openStudent(student.id)}
                >
                  <span className="student-pick-mark">{student.firstName.charAt(0)}</span>
                  <span>
                    {studentName(student)}
                    <span className="record-meta" style={{ display: "block" }}>
                      {classPlaceLabel({ status: student.status, class: classOf(student) })}
                    </span>
                  </span>
                </button>
              ))}
              {matches.length === 0 ? <p className="record-meta">No student matches that name.</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <section>
        <h2 className="teacher-panel-title">Today at a Glance</h2>
        <div className="admin-glance">
          {glance.map((card) => (
            <Link key={card.label} href={card.href} className={`progress-stat teacher-stat-link ${card.tone}`}>
              <p className={`progress-stat-value${typeof card.value === "string" ? " is-text" : ""}`}>{ready ? card.value : "—"}</p>
              <p className="progress-stat-label">{card.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="teacher-panels">
        <article className="card teacher-panel">
          <h2 className="teacher-panel-title">Needs Attention</h2>
          {!ready ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>Loading school alerts.</p>
          ) : visibleAttention.length === 0 ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>
              {needle ? "No alerts match that search." : "No unpaid tuition, attendance, or homework alerts right now."}
            </p>
          ) : (
            <div className="record-list">
              {visibleAttention.map((item) => (
                <Link key={item.id} href={item.href} className="record-card teacher-feed-row">
                  <div>
                    <p className="record-title">{item.name}</p>
                    <p className="record-meta">{item.reason}</p>
                  </div>
                  <StatusBadge status={item.tone} />
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card teacher-panel">
          <h2 className="teacher-panel-title">Recent Activity</h2>
          {!ready ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>Loading recent activity.</p>
          ) : visibleActivity.length === 0 ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>
              {needle ? "No activity matches that search." : "New enrollments, payments, progress, and attendance will show here."}
            </p>
          ) : (
            <div className="record-list">
              {visibleActivity.map((item) => (
                <Link key={item.id} href={item.href} className="record-card teacher-feed-row">
                  <div>
                    <p className="record-title">{item.text}</p>
                    <p className="record-meta">
                      {item.meta}
                      {item.at && !item.meta.includes(formatShortDate(item.at)) ? ` · ${formatShortDate(item.at)}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

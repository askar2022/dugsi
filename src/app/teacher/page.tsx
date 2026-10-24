"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { homeworkAssignedToStudent } from "@/lib/performance";
import { homeworkCompletionCounts } from "@/lib/homework";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { quranPortion } from "@/lib/quran";
import type { Session } from "@/lib/types";

type SchoolClass = { id: string; name: string; dayOfWeek?: string | null };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
  classId?: string | null;
  class?: { id?: string; name?: string } | null;
};
type Attendance = { studentId: string; status: string; date: string };
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
  student?: { id: string; firstName?: string; lastName?: string };
};
type Completion = { studentId: string; status: string; updatedAt?: string | null };
type Homework = {
  id: string;
  title: string;
  dueDate?: string | null;
  studentId?: string | null;
  classId: string;
  completions?: Completion[];
};

type Attention = { id: string; name: string; reason: string; href: string };
type Activity = { id: string; text: string; meta: string; href: string; at: string };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isActiveStudent(student: Student) {
  return (
    student.status !== "unenrolled" &&
    student.status !== "declined" &&
    student.status !== "pending" &&
    student.status !== "waiting_assessment"
  );
}

function studentName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`;
}

function latestProgress(progress: Progress[], studentId: string) {
  return progress.find((item) => item.studentId === studentId || item.student?.id === studentId) ?? null;
}

function nextClassDate(dayOfWeek?: string | null, now = new Date()) {
  const target = WEEKDAYS.findIndex((day) => day.toLowerCase() === (dayOfWeek ?? "").toLowerCase());
  const date = new Date(now);
  if (target < 0) return date;
  date.setDate(date.getDate() + ((target - date.getDay() + 7) % 7));
  return date;
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatShortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function homeworkOpen(item: Homework) {
  const counts = homeworkCompletionCounts(item.completions ?? []);
  const total = counts.done + counts.needsHelp + counts.assigned;
  return total === 0 || counts.assigned > 0 || counts.needsHelp > 0;
}

export default function TeacherHomePage() {
  const router = useRouter();
  const searchBox = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<Session | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ user: Session }>("/api/auth/me"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ students: Student[] }>("/api/students"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
      api<{ progress: Progress[] }>("/api/progress"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]).then(([me, classData, studentData, attendanceData, progressData, homeworkData]) => {
      setUser(me.user);
      setClasses(classData.classes);
      setStudents(studentData.students);
      setAttendance(attendanceData.attendance);
      setProgress(progressData.progress);
      setHomework(homeworkData.homework);
    });
  }, []);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!searchBox.current?.contains(event.target as Node)) setSearchOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  const roster = useMemo(() => students.filter(isActiveStudent), [students]);
  const asOf = todayIso();
  const windowStart = addDays(asOf, -27);
  const klass = classes[0] ?? null;
  const welcomeDate = formatLongDate(nextClassDate(klass?.dayOfWeek));

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return roster.filter((student) => studentName(student).toLowerCase().includes(needle)).slice(0, 8);
  }, [query, roster]);

  const todayMarks = attendance.filter((row) => row.date === asOf);
  const attendanceMarked = roster.length > 0 && roster.every((student) => todayMarks.some((row) => row.studentId === student.id));
  const presentToday = todayMarks.filter((row) => row.status === "present").length;

  const needSupport = roster.filter((student) => normalizeProgressStatus(latestProgress(progress, student.id)?.status) === "contact_parent");
  const homeworkDue = homework.filter(homeworkOpen).length;

  const needsAttention = useMemo(() => {
    const rows: Attention[] = [];
    for (const student of roster) {
      const href = `/teacher/students/${student.id}`;
      const name = studentName(student);
      const marks = attendance.filter((row) => row.studentId === student.id && row.date >= windowStart);
      const absents = marks.filter((row) => row.status === "absent").length;
      const poorAttendance = absents >= 2 || (marks.length >= 2 && absents / marks.length >= 0.5);
      const latest = latestProgress(progress, student.id);
      const tone = latest ? normalizeProgressStatus(latest.status) : null;
      const behind = tone === "needs_practice" || tone === "contact_parent";
      const help = homework.some((item) =>
        (item.completions ?? []).some((row) => row.studentId === student.id && row.status === "needs_help"),
      );
      if (poorAttendance) rows.push({ id: `${student.id}-attend`, name, reason: "Poor attendance", href });
      if (behind) rows.push({ id: `${student.id}-quran`, name, reason: "Behind Qur’an goal", href });
      if (help) rows.push({ id: `${student.id}-help`, name, reason: "Homework marked Needs Help", href });
    }
    return rows.slice(0, 8);
  }, [attendance, homework, progress, roster, windowStart]);

  const recentActivity = useMemo(() => {
    const rows: Activity[] = [];
    for (const item of progress) {
      const student = roster.find((row) => row.id === item.studentId || row.id === item.student?.id);
      if (!student) continue;
      rows.push({
        id: `progress-${item.id ?? item.studentId}-${item.date}`,
        text: `${studentName(student)} · progress updated`,
        meta: quranPortion(item) || item.surah,
        href: `/teacher/students/${student.id}`,
        at: item.createdAt || `${item.date}T12:00:00`,
      });
    }
    for (const item of homework) {
      for (const row of item.completions ?? []) {
        if (row.status !== "done" && row.status !== "needs_help") continue;
        const student = roster.find((person) => person.id === row.studentId);
        if (!student || !homeworkAssignedToStudent(item, student)) continue;
        rows.push({
          id: `hw-${item.id}-${row.studentId}`,
          text:
            row.status === "needs_help"
              ? `${studentName(student)} · parent response received`
              : `${studentName(student)} · homework completed`,
          meta: item.title,
          href: `/teacher/students/${student.id}`,
          at: row.updatedAt || asOf,
        });
      }
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [asOf, homework, progress, roster]);

  function openStudent(id: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(`/teacher/students/${id}`);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (matches[0]) openStudent(matches[0].id);
  }

  return (
    <div className="page-stack">
      <section className="teacher-welcome">
        <h1 className="page-title">Welcome{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="page-copy">
          {klass?.name ?? "Your class"}
          {` · ${welcomeDate}`}
        </p>
        <div className="teacher-search" ref={searchBox}>
          <form onSubmit={onSearch}>
            <input
              className="input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search a student..."
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
                    {studentName(student)}
                  </button>
                ))}
                {matches.length === 0 ? <p className="record-meta">No student in your class matches that name.</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="progress-summary">
        <article className="progress-stat is-on">
          <p className="progress-stat-value">{roster.length}</p>
          <p className="progress-stat-label">Students</p>
        </article>
        <Link href="/teacher/attendance" className={`progress-stat teacher-stat-link ${attendanceMarked ? "is-on" : "is-attention"}`}>
          <p className={`progress-stat-value${attendanceMarked ? "" : " is-text"}`}>{attendanceMarked ? presentToday : "Not Marked"}</p>
          <p className="progress-stat-label">{attendanceMarked ? "Attendance marked" : "Attendance"}</p>
        </Link>
        <article className="progress-stat is-support">
          <p className="progress-stat-value">{needSupport.length}</p>
          <p className="progress-stat-label">Need Support</p>
        </article>
        <article className="progress-stat is-attention">
          <p className="progress-stat-value">{homeworkDue}</p>
          <p className="progress-stat-label">Homework Assignments Due</p>
        </article>
      </section>

      <section className="teacher-panels">
        <article className="card teacher-panel">
          <h2 className="teacher-panel-title">Needs Attention</h2>
          {needsAttention.length === 0 ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>No poor attendance, Qur’an, or homework alerts right now.</p>
          ) : (
            <div className="record-list">
              {needsAttention.map((item) => (
                <Link key={item.id} href={item.href} className="record-card teacher-feed-row">
                  <div>
                    <p className="record-title">{item.name}</p>
                    <p className="record-meta">{item.reason}</p>
                  </div>
                  <StatusBadge status={item.reason.includes("Help") ? "needs_help" : item.reason.includes("attendance") ? "absent" : "needs_practice"} />
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card teacher-panel">
          <h2 className="teacher-panel-title">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="record-meta" style={{ marginTop: "0.65rem" }}>Progress, homework, and parent replies will show here.</p>
          ) : (
            <div className="record-list">
              {recentActivity.map((item) => (
                <Link key={item.id} href={item.href} className="record-card teacher-feed-row">
                  <div>
                    <p className="record-title">{item.text}</p>
                    <p className="record-meta">{item.meta}{item.at ? ` · ${formatShortDate(item.at)}` : ""}</p>
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

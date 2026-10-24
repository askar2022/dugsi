"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { normalizeProgressStatus, PROGRESS_LABELS } from "@/lib/progress-status";
import { completedJuzes, finishesJuz, quranPortion } from "@/lib/quran";
import { downloadTablePdf } from "@/lib/table-pdf";
import type { Session } from "@/lib/types";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  class?: {
    id: string;
    name: string;
    teacher?: { id: string; name: string } | null;
  } | null;
};

type Progress = {
  studentId: string;
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz: number | null;
  date: string;
  status?: string | null;
};

type Attendance = { studentId: string; status: string; date?: string };
type SchoolClass = { id: string; name: string; level?: string | null; teacher?: { id: string; name: string } | null };
type Teacher = { id: string; name: string };
type StatusFilter = "all" | "on_track" | "needs_practice" | "contact_parent" | "none";
type AttendanceFilter = "all" | "present" | "late" | "absent" | "poor";
type JuzFilter = "all" | "completed" | "none";

const PAGE_SIZE = 25;

function latestByStudent(progress: Progress[]) {
  const map = new Map<string, Progress>();
  for (const item of progress) {
    if (!map.has(item.studentId)) map.set(item.studentId, item);
  }
  return map;
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function progressText(record: Progress | undefined, finished: Array<{ juz: number }>) {
  if (!record) return "No record";
  if (record.juz && (finishesJuz(record) || finished.some((item) => item.juz === record.juz))) {
    return `Juz ${record.juz} Completed`;
  }
  if (record.juz && record.surah) return `Juz ${record.juz}, ${record.surah}`;
  return quranPortion(record) || record.surah;
}

function attendanceSummary(marks: Attendance[]) {
  if (!marks.length) return { label: "No record", latest: "", late: 0, absent: 0, poor: false };
  const late = marks.filter((row) => row.status === "late").length;
  const absent = marks.filter((row) => row.status === "absent").length;
  const rate = marks.length ? absent / marks.length : 0;
  const poor = absent >= 3 || (marks.length >= 4 && rate >= 0.25);
  const latest = marks[0]?.status ?? "";
  let label = "No record";
  if (late >= 2) label = `${late} late`;
  else if (absent >= 2) label = `${absent} absent`;
  else if (latest === "present") label = "Present";
  else if (latest === "late") label = "Late";
  else if (latest === "absent") label = "Absent";
  else if (latest === "excused") label = "Excused";
  return { label, latest, late, absent, poor };
}

function progressTone(record?: Progress) {
  return record ? normalizeProgressStatus(record.status) : "no_record";
}

export default function AdminProgressPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolName, setSchoolName] = useState("Quran progress");
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>("all");
  const [juzFilter, setJuzFilter] = useState<JuzFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ progress: Progress[] }>("/api/progress"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ teachers: Teacher[] }>("/api/staff"),
      api<{ user: Session }>("/api/auth/me"),
    ]).then(([studentData, progressData, attendanceData, classData, staffData, sessionData]) => {
      setStudents(
        studentData.students
          .filter((student) =>
            student.status !== "unenrolled"
            && student.status !== "declined"
            && student.status !== "waiting_assessment"
            && student.status !== "pending"
            && !isAssessmentClass(student.class),
          )
          .map((student) => ({
            ...student,
            class: student.class
              ? {
                  ...student.class,
                  teacher: Array.isArray(student.class.teacher) ? student.class.teacher[0] : student.class.teacher,
                }
              : null,
          })),
      );
      setProgress(progressData.progress);
      setAttendance(attendanceData.attendance);
      setClasses(
        classData.classes
          .filter((item) => !isAssessmentClass(item))
          .map((item) => ({
            ...item,
            teacher: Array.isArray(item.teacher) ? item.teacher[0] : item.teacher,
          })),
      );
      setTeachers(staffData.teachers);
      setSchoolName(sessionData.user.tenantName ?? "Quran progress");
    });
  }, []);

  const latest = useMemo(() => latestByStudent(progress), [progress]);
  const finishedByStudent = useMemo(() => {
    const map = new Map<string, Array<{ juz: number; date: string }>>();
    for (const student of students) {
      map.set(student.id, completedJuzes(progress.filter((item) => item.studentId === student.id)));
    }
    return map;
  }, [progress, students]);
  const marksByStudent = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const row of attendance) {
      const list = map.get(row.studentId) ?? [];
      list.push(row);
      map.set(row.studentId, list);
    }
    return map;
  }, [attendance]);

  const reports = useMemo(() => {
    return students.map((student) => {
      const record = latest.get(student.id);
      const finished = finishedByStudent.get(student.id) ?? [];
      const attend = attendanceSummary(marksByStudent.get(student.id) ?? []);
      return {
        student,
        record,
        finished,
        attend,
        quran: progressText(record, finished),
        tone: progressTone(record),
        updated: record?.date ?? finished[0]?.date ?? "",
      };
    });
  }, [finishedByStudent, latest, marksByStudent, students]);

  const totals = useMemo(() => {
    return reports.reduce(
      (sum, row) => {
        if (row.tone === "on_track") sum.on_track += 1;
        else if (row.tone === "needs_practice") sum.needs_practice += 1;
        else if (row.tone === "contact_parent") sum.contact_parent += 1;
        else sum.none += 1;
        return sum;
      },
      { on_track: 0, needs_practice: 0, contact_parent: 0, none: 0 },
    );
  }, [reports]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reports.filter((row) => {
      const teacher = row.student.class?.teacher?.name ?? "";
      const haystack = `${row.student.firstName} ${row.student.lastName} ${row.student.class?.name ?? ""} ${teacher}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (classId && row.student.class?.id !== classId) return false;
      if (teacherId && row.student.class?.teacher?.id !== teacherId) return false;
      if (status === "none" && row.record) return false;
      if (status !== "all" && status !== "none" && row.tone !== status) return false;
      if (attendanceFilter === "present" && row.attend.latest !== "present") return false;
      if (attendanceFilter === "late" && row.attend.late === 0 && row.attend.latest !== "late") return false;
      if (attendanceFilter === "absent" && row.attend.absent === 0 && row.attend.latest !== "absent") return false;
      if (attendanceFilter === "poor" && !row.attend.poor) return false;
      if (juzFilter === "completed" && row.finished.length === 0) return false;
      if (juzFilter === "none" && row.finished.length > 0) return false;
      return true;
    });
  }, [attendanceFilter, classId, juzFilter, query, reports, status, teacherId]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function exportPdf() {
    downloadTablePdf({
      title: schoolName,
      subtitle: "Quran progress by student",
      filename: "quran-progress.pdf",
      columns: [
        { key: "student", label: "Student", x: 36 },
        { key: "className", label: "Class", x: 140 },
        { key: "teacher", label: "Teacher", x: 230 },
        { key: "quran", label: "Quran", x: 330 },
        { key: "attendance", label: "Attendance", x: 430 },
        { key: "tone", label: "Status", x: 510 },
      ],
      rows: rows.map((row) => ({
        student: `${row.student.firstName} ${row.student.lastName}`,
        className: row.student.class?.name ?? "—",
        teacher: row.student.class?.teacher?.name ?? "—",
        quran: row.quran,
        attendance: row.attend.label,
        tone: row.tone === "on_track" || row.tone === "needs_practice" || row.tone === "contact_parent"
          ? PROGRESS_LABELS[row.tone]
          : "No Record",
      })),
      footer: `${rows.length} student${rows.length === 1 ? "" : "s"} on this filtered list.`,
    });
  }

  return (
    <div className="page-stack">
      <PageHeader title="Quran progress" description="See each student’s Qur’an level, attendance, and who needs support." />

      <section className="progress-summary">
        <article className="progress-stat is-on">
          <p className="progress-stat-value">{totals.on_track}</p>
          <p className="progress-stat-label">On Track</p>
        </article>
        <article className="progress-stat is-attention">
          <p className="progress-stat-value">{totals.needs_practice}</p>
          <p className="progress-stat-label">Needs Attention</p>
        </article>
        <article className="progress-stat is-support">
          <p className="progress-stat-value">{totals.contact_parent}</p>
          <p className="progress-stat-label">Needs Support</p>
        </article>
        <article className="progress-stat is-none">
          <p className="progress-stat-value">{totals.none}</p>
          <p className="progress-stat-label">No Record</p>
        </article>
      </section>

      <section className="card progress-filters">
        <input
          className="input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search student, teacher, or class..."
        />
        <div className="progress-filter-grid">
          <select className="select" value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }}>
            <option value="">All Classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select className="select" value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setPage(1); }}>
            <option value="">All Teachers</option>
            {teachers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select className="select" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }}>
            <option value="all">All Statuses</option>
            <option value="on_track">On Track</option>
            <option value="needs_practice">Needs Attention</option>
            <option value="contact_parent">Needs Support</option>
            <option value="none">No Record</option>
          </select>
          <select className="select" value={attendanceFilter} onChange={(event) => { setAttendanceFilter(event.target.value as AttendanceFilter); setPage(1); }}>
            <option value="all">Attendance</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="poor">Poor attendance</option>
          </select>
          <select className="select" value={juzFilter} onChange={(event) => { setJuzFilter(event.target.value as JuzFilter); setPage(1); }}>
            <option value="all">Juz Completed</option>
            <option value="completed">Juz completed</option>
            <option value="none">No Juz completed</option>
          </select>
        </div>
        <div className="homework-filter-meta">
          <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setClassId(""); setTeacherId(""); setStatus("all"); setAttendanceFilter("all"); setJuzFilter("all"); setPage(1); }}>
            Clear filters
          </button>
          <button type="button" className="btn btn-primary" onClick={exportPdf} disabled={rows.length === 0}>
            Export PDF
          </button>
          <p className="page-copy" style={{ margin: 0 }}>
            {rows.length === 0 ? "No students match these filters." : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
          </p>
        </div>
      </section>

      <div className="record-list progress-mobile">
        {visible.length === 0 ? (
          <p className="page-copy">No students match. Teachers save Quran progress from their class page.</p>
        ) : (
          visible.map((row) => (
            <Link key={row.student.id} href={`/admin/students/${row.student.id}`} className="progress-student-card">
              <p className="record-title">{row.student.firstName} {row.student.lastName}</p>
              <p className="record-meta">
                {row.student.class?.name ?? "No class"}
                {row.student.class?.teacher?.name ? ` · ${row.student.class.teacher.name}` : ""}
              </p>
              <p className="homework-portion">{row.quran}</p>
              <p className="record-meta">{row.attend.label}{row.updated ? ` · ${shortDate(row.updated)}` : ""}</p>
              <StatusBadge status={row.tone} />
            </Link>
          ))
        )}
      </div>

      <div className="progress-table-wrap progress-desktop">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Qur’an Progress</th>
              <th>Attendance</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7}>No students match. Teachers save Quran progress from their class page.</td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.student.id}
                  onClick={() => router.push(`/admin/students/${row.student.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/admin/students/${row.student.id}`);
                    }
                  }}
                  tabIndex={0}
                >
                  <td>{row.student.firstName} {row.student.lastName}</td>
                  <td>{row.student.class?.name ?? "—"}</td>
                  <td>{row.student.class?.teacher?.name ?? "—"}</td>
                  <td>{row.quran}</td>
                  <td>{row.attend.label}</td>
                  <td><StatusBadge status={row.tone} /></td>
                  <td>{shortDate(row.updated)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > PAGE_SIZE ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button className="btn btn-ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <button className="btn btn-ghost" type="button" disabled={currentPage * PAGE_SIZE >= rows.length} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      ) : null}
    </div>
  );
}

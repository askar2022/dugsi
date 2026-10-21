"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { classSupportTone, normalizeProgressStatus, PROGRESS_LABELS } from "@/lib/progress-status";
import { completedJuzes, quranPortion } from "@/lib/quran";
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

type Attendance = { studentId: string; status: string };
type SchoolClass = { id: string; name: string; teacher?: { id: string; name: string } | null };
type Teacher = { id: string; name: string };
type StatusFilter = "all" | "on_track" | "needs_practice" | "contact_parent" | "none";

const PAGE_SIZE = 25;

function latestByStudent(progress: Progress[]) {
  const map = new Map<string, Progress>();
  for (const item of progress) {
    if (!map.has(item.studentId)) map.set(item.studentId, item);
  }
  return map;
}

export default function AdminProgressPage() {
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
          .filter((student) => student.status !== "unenrolled" && student.status !== "declined")
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
        classData.classes.map((item) => ({
          ...item,
          teacher: Array.isArray(item.teacher) ? item.teacher[0] : item.teacher,
        })),
      );
      setTeachers(staffData.teachers);
      setSchoolName(sessionData.user.tenantName ?? "Quran progress");
    });
  }, []);

  const latest = useMemo(() => latestByStudent(progress), [progress]);

  const poorAttendance = useMemo(() => {
    return students.map((student) => {
      const marks = attendance.filter((row) => row.studentId === student.id);
      const absent = marks.filter((row) => row.status === "absent").length;
      const late = marks.filter((row) => row.status === "late").length;
      const rate = marks.length ? absent / marks.length : 0;
      const poor = absent >= 3 || (marks.length >= 4 && rate >= 0.25);
      return { student, marks: marks.length, absent, late, poor };
    }).filter((row) => row.poor).sort((a, b) => b.absent - a.absent);
  }, [attendance, students]);

  const juzAccomplishments = useMemo(() => {
    return students.flatMap((student) => {
      const records = progress.filter((item) => item.studentId === student.id);
      return completedJuzes(records).map((item) => ({ student, ...item }));
    }).sort((a, b) => b.date.localeCompare(a.date) || b.juz - a.juz);
  }, [progress, students]);

  const classCards = useMemo(() => {
    return classes.map((klass) => {
      const kids = students.filter((student) => student.class?.id === klass.id);
      const counts = { on_track: 0, needs_practice: 0, contact_parent: 0, none: 0 };
      for (const student of kids) {
        const record = latest.get(student.id);
        if (!record) counts.none += 1;
        else counts[normalizeProgressStatus(record.status)] += 1;
      }
      return {
        ...klass,
        students: kids.length,
        counts,
        tone: classSupportTone(counts),
      };
    }).sort((a, b) => {
      const rank = { contact_parent: 0, needs_practice: 1, no_record: 2, on_track: 3 };
      return (rank[a.tone] ?? 4) - (rank[b.tone] ?? 4);
    });
  }, [classes, latest, students]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const record = latest.get(student.id);
      const tone = record ? normalizeProgressStatus(record.status) : "none";
      const teacher = student.class?.teacher?.name ?? "";
      const haystack = `${student.firstName} ${student.lastName} ${student.class?.name ?? ""} ${teacher} ${record?.surah ?? ""}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (classId && student.class?.id !== classId) return false;
      if (teacherId && student.class?.teacher?.id !== teacherId) return false;
      if (status === "none" && record) return false;
      if (status !== "all" && status !== "none" && tone !== status) return false;
      return true;
    });
  }, [classId, latest, query, status, students, teacherId]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totals = classCards.reduce(
    (sum, item) => ({
      on_track: sum.on_track + item.counts.on_track,
      needs_practice: sum.needs_practice + item.counts.needs_practice,
      contact_parent: sum.contact_parent + item.counts.contact_parent,
      none: sum.none + item.counts.none,
    }),
    { on_track: 0, needs_practice: 0, contact_parent: 0, none: 0 },
  );

  function exportPdf() {
    downloadTablePdf({
      title: schoolName,
      subtitle: "Quran progress by student",
      filename: "quran-progress.pdf",
      columns: [
        { key: "student", label: "Student", x: 36 },
        { key: "className", label: "Class", x: 150 },
        { key: "teacher", label: "Teacher", x: 250 },
        { key: "quran", label: "Quran", x: 360 },
        { key: "tone", label: "Progress", x: 470 },
      ],
      rows: rows.map((student) => {
        const record = latest.get(student.id);
        return {
          student: `${student.firstName} ${student.lastName}`,
          className: student.class?.name ?? "—",
          teacher: student.class?.teacher?.name ?? "—",
          quran: record ? quranPortion(record) || record.surah : "No record yet",
          tone: record ? PROGRESS_LABELS[normalizeProgressStatus(record.status)] : "No record yet",
        };
      }),
      footer: `${rows.length} student${rows.length === 1 ? "" : "s"} on this filtered list.`,
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Quran progress"
        description="Monitor teacher records, poor attendance, and children who finished a Juz."
      />
      <section className="metric-grid">
        <article className="card metric-card is-paid">
          <p className="metric-label">On track</p>
          <p className="metric-value">{totals.on_track}</p>
          <p className="metric-detail">Green — teachers say these children are doing well</p>
        </article>
        <article className="card metric-card is-due">
          <p className="metric-label">Needs practice</p>
          <p className="metric-value">{totals.needs_practice}</p>
          <p className="metric-detail">Yellow — watch these classes</p>
        </article>
        <article className="card metric-card is-late">
          <p className="metric-label">Needs support</p>
          <p className="metric-value">{totals.contact_parent}</p>
          <p className="metric-detail">Red — contact the family and help the class</p>
        </article>
        <article className="card metric-card is-due">
          <p className="metric-label">No record yet</p>
          <p className="metric-value">{totals.none}</p>
          <p className="metric-detail">Teacher has not saved Quran progress</p>
        </article>
      </section>

      <section className="record-list">
        <article className="card record-card-stack">
          <h2 className="page-title" style={{ fontSize: "1.35rem" }}>Poor attendance</h2>
          <p className="page-copy">Children who missed class often. Follow up with the teacher and family.</p>
          {poorAttendance.length === 0 ? (
            <p className="record-meta">No poor attendance yet. This list appears after several absences.</p>
          ) : (
            <div className="homework-status-list">
              {poorAttendance.map((row) => (
                <div key={row.student.id} className="homework-status-row">
                  <div>
                    <p className="record-title">{row.student.firstName} {row.student.lastName}</p>
                    <p className="record-meta">
                      {row.student.class?.name ?? "No class"}
                      {row.student.class?.teacher?.name ? ` · ${row.student.class.teacher.name}` : ""}
                      {` · ${row.absent} absent`}
                      {row.late ? ` · ${row.late} late` : ""}
                      {` · ${row.marks} days marked`}
                    </p>
                  </div>
                  <StatusBadge status="absent" />
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="card record-card-stack progress-row is-on_track">
          <h2 className="page-title" style={{ fontSize: "1.35rem" }}>Juz finished</h2>
          <p className="page-copy">A child who completes a Juz is an accomplishment for the class.</p>
          {juzAccomplishments.length === 0 ? (
            <p className="record-meta">No finished Juz yet. This appears when a child moves to the next Juz.</p>
          ) : (
            <div className="homework-status-list">
              {juzAccomplishments.map((row) => (
                <div key={`${row.student.id}-${row.juz}`} className="homework-status-row">
                  <div>
                    <p className="record-title">{row.student.firstName} {row.student.lastName}</p>
                    <p className="record-meta">
                      {row.student.class?.name ?? "No class"}
                      {row.student.class?.teacher?.name ? ` · ${row.student.class.teacher.name}` : ""}
                      {` · ${row.date}`}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-green-soft text-paid">
                    Juz {row.juz} finished
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {classCards.length > 0 ? (
        <section className="record-list">
          {classCards.map((klass) => (
            <article key={klass.id} className={`card record-card-stack progress-row is-${klass.tone === "no_record" ? "needs_practice" : klass.tone}`}>
              <div className="homework-card-top">
                <p className="record-title">{klass.name}</p>
                <StatusBadge status={klass.tone === "contact_parent" ? "needs_support" : klass.tone} />
              </div>
              <p className="record-meta">
                {klass.teacher?.name ?? "No teacher yet"}
                {` · ${klass.students} student${klass.students === 1 ? "" : "s"}`}
              </p>
              <p className="record-meta">
                {klass.counts.on_track} on track · {klass.counts.needs_practice} need practice · {klass.counts.contact_parent} need support · {klass.counts.none} no record
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="card homework-filters">
        <input
          className="input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search student, class, teacher, or Surah"
        />
        <div className="teacher-filters homework-filter-grid">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Class</span>
            <select className="select" value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }}>
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Teacher</span>
            <select className="select" value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setPage(1); }}>
              <option value="">All teachers</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Progress</span>
            <select className="select" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }}>
              <option value="all">All colors</option>
              <option value="on_track">On track</option>
              <option value="needs_practice">Needs practice</option>
              <option value="contact_parent">Needs support</option>
              <option value="none">No record yet</option>
            </select>
          </label>
        </div>
        <div className="homework-filter-meta">
          <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setClassId(""); setTeacherId(""); setStatus("all"); setPage(1); }}>
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
        {visible.map((student) => {
          const record = latest.get(student.id);
          const tone = record ? normalizeProgressStatus(record.status) : "no_record";
          return (
            <article key={student.id} className={`card record-card-stack progress-row is-${tone === "no_record" ? "needs_practice" : tone}`}>
              <p className="record-title">{student.firstName} {student.lastName}</p>
              <p className="record-meta">
                {student.class?.name ?? "No class"}
                {student.class?.teacher?.name ? ` · ${student.class.teacher.name}` : ""}
              </p>
              <p className="homework-portion">
                {record ? quranPortion(record) || `Surah ${record.surah}` : "No Quran record yet"}
              </p>
              {record?.date ? <p className="record-meta">Recorded {record.date}</p> : null}
              <StatusBadge status={tone} />
            </article>
          );
        })}
      </div>

      <div className="card table-wrap p-2 progress-desktop">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Juz</th>
              <th>Surah</th>
              <th>Ayah</th>
              <th>Date</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8}>No students match. Teachers save Quran progress from their class page.</td>
              </tr>
            ) : (
              visible.map((student) => {
                const record = latest.get(student.id);
                const tone = record ? normalizeProgressStatus(record.status) : "no_record";
                return (
                  <tr key={student.id} className={`progress-row is-${tone === "no_record" ? "needs_practice" : tone}`}>
                    <td>{student.firstName} {student.lastName}</td>
                    <td>{student.class?.name ?? "—"}</td>
                    <td>{student.class?.teacher?.name ?? "—"}</td>
                    <td>{record?.juz ?? "—"}</td>
                    <td>{record?.surah ?? "—"}</td>
                    <td>{record ? `${record.ayahFrom ?? "—"}–${record.ayahTo ?? "—"}` : "—"}</td>
                    <td>{record?.date ?? "—"}</td>
                    <td><StatusBadge status={tone} /></td>
                  </tr>
                );
              })
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

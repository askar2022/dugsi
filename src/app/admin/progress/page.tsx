"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { ProgressForm, type ProgressPayload, type ProgressRecord, type ProgressStudent } from "@/components/portal/ProgressForm";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";

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
  id: string;
  studentId: string;
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz: number | null;
  date: string;
};

type SchoolClass = { id: string; name: string; level?: string | null; teacher?: { id: string; name: string } | null };
type Teacher = { id: string; name: string };

const PAGE_SIZE = 25;

function teacherOf(student?: Student | null) {
  return student?.class?.teacher ?? null;
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function ayahRange(record?: Progress) {
  if (!record?.ayahFrom && !record?.ayahTo) return "—";
  if (record.ayahFrom && record.ayahTo) return `${record.ayahFrom}–${record.ayahTo}`;
  return String(record.ayahFrom || record.ayahTo);
}

export default function AdminProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [page, setPage] = useState(1);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Progress | null>(null);

  async function load() {
    const [studentData, progressData, classData, staffData] = await Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ progress: Progress[] }>("/api/progress"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ teachers: Teacher[] }>("/api/staff"),
    ]);
    setStudents(
      studentData.students
        .filter((student) =>
          student.status !== "unenrolled"
          && student.status !== "declined"
          && student.status !== "waiting_assessment"
          && student.status !== "pending"
          && student.status !== "ready_for_class"
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
    setClasses(
      classData.classes
        .filter((item) => !isAssessmentClass(item))
        .map((item) => ({
          ...item,
          teacher: Array.isArray(item.teacher) ? item.teacher[0] : item.teacher,
        })),
    );
    setTeachers(staffData.teachers);
  }

  useEffect(() => {
    load();
  }, []);

  const latest = useMemo(() => {
    const map = new Map<string, Progress>();
    for (const item of progress) {
      if (!map.has(item.studentId)) map.set(item.studentId, item);
    }
    return map;
  }, [progress]);

  const historyByStudent = useMemo(() => {
    const map = new Map<string, Progress[]>();
    for (const item of progress) {
      const list = map.get(item.studentId) ?? [];
      list.push(item);
      map.set(item.studentId, list);
    }
    return map;
  }, [progress]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const teacher = teacherOf(student)?.name ?? "";
      const haystack = `${student.firstName} ${student.lastName} ${student.class?.name ?? ""} ${teacher}`.toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (classId && student.class?.id !== classId) return false;
      if (teacherId && teacherOf(student)?.id !== teacherId) return false;
      return true;
    }).map((student) => ({
      student,
      record: latest.get(student.id),
      history: historyByStudent.get(student.id) ?? [],
    }));
  }, [classId, historyByStudent, latest, query, students, teacherId]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const historyStudent = students.find((item) => item.id === historyFor) ?? null;
  const historyRows = historyFor ? historyByStudent.get(historyFor) ?? [] : [];
  const formStudents: ProgressStudent[] = students.map((item) => ({
    id: item.id,
    firstName: item.firstName,
    lastName: item.lastName,
  }));

  async function saveEdit(payload: ProgressPayload) {
    if (!editing) return;
    await api(`/api/progress/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setEditing(null);
    await load();
  }

  function actions(row: { student: Student; record?: Progress; history: Progress[] }) {
    return (
      <div className="homework-mini-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setHistoryFor(row.student.id)}>
          View History
        </button>
        {row.record ? (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(row.record ?? null)}>
            Edit Record
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Qur’an Progress"
        description="Each student’s exact learning record: Juz, Surah, ayah range, and update history. How well they are doing is on Performance."
      />

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
        </div>
        <div className="homework-filter-meta">
          <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setClassId(""); setTeacherId(""); setPage(1); }}>
            Clear filters
          </button>
          <p className="page-copy" style={{ margin: 0 }}>
            {rows.length === 0 ? "No students match these filters." : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
          </p>
        </div>
      </section>

      <div className="record-list progress-mobile">
        {visible.length === 0 ? (
          <p className="page-copy">No students match. Teachers save Qur’an records from Record Progress.</p>
        ) : (
          visible.map((row) => (
            <article key={row.student.id} className="progress-student-card">
              <p className="record-title">{row.student.firstName} {row.student.lastName}</p>
              <p className="record-meta">
                {row.student.class?.name ?? "No class"}
                {teacherOf(row.student)?.name ? ` · ${teacherOf(row.student)?.name}` : ""}
              </p>
              <p className="homework-portion">
                {row.record ? `Juz ${row.record.juz ?? "—"} · ${row.record.surah} · Ayah ${ayahRange(row.record)}` : "No record"}
              </p>
              <p className="record-meta">{shortDate(row.record?.date)}</p>
              {actions(row)}
            </article>
          ))
        )}
      </div>

      <div className="progress-table-wrap progress-desktop">
        <table className="progress-table is-records">
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Juz</th>
              <th>Surah</th>
              <th>Ayah From–To</th>
              <th>Last Updated</th>
              <th>View History</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8}>No students match. Teachers save Qur’an records from Record Progress.</td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.student.id}>
                  <td>{row.student.firstName} {row.student.lastName}</td>
                  <td>{row.student.class?.name ?? "—"}</td>
                  <td>{teacherOf(row.student)?.name ?? "—"}</td>
                  <td>{row.record?.juz ?? "—"}</td>
                  <td>{row.record?.surah ?? "—"}</td>
                  <td>{ayahRange(row.record)}</td>
                  <td>{shortDate(row.record?.date)}</td>
                  <td>{actions(row)}</td>
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

      {historyFor ? (
        <div className="homework-drawer" onClick={() => setHistoryFor(null)}>
          <div className="homework-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="homework-drawer-top">
              <h2 className="page-title" style={{ fontSize: "1.45rem" }}>
                {historyStudent ? `${historyStudent.firstName} ${historyStudent.lastName}` : "Progress history"}
              </h2>
              <button type="button" className="btn btn-ghost" onClick={() => setHistoryFor(null)}>Close</button>
            </div>
            {historyStudent ? (
              <p className="page-copy">
                {historyStudent.class?.name ?? "No class"}
                {teacherOf(historyStudent)?.name ? ` · ${teacherOf(historyStudent)?.name}` : ""}
              </p>
            ) : null}
            {historyRows.length === 0 ? (
              <p className="page-copy">No Qur’an updates have been saved for this student yet.</p>
            ) : (
              <div className="record-list">
                {historyRows.map((item) => (
                  <article key={item.id} className="card" style={{ padding: "0.9rem 1rem" }}>
                    <p className="record-title">{shortDate(item.date)}</p>
                    <p className="record-meta">Juz {item.juz ?? "—"} · {item.surah} · Ayah {ayahRange(item)}</p>
                  </article>
                ))}
              </div>
            )}
            {historyStudent ? (
              <Link href={`/admin/students/${historyStudent.id}?from=progress`} className="btn btn-ghost">
                Open student
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="homework-drawer" onClick={() => setEditing(null)}>
          <div className="homework-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="homework-drawer-top">
              <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Edit Record</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Close</button>
            </div>
            <ProgressForm
              key={editing.id}
              students={formStudents}
              progress={{
                id: editing.id,
                studentId: editing.studentId,
                surah: editing.surah,
                ayahFrom: editing.ayahFrom ?? 1,
                ayahTo: editing.ayahTo ?? editing.ayahFrom ?? 1,
                juz: editing.juz,
                date: editing.date,
              } satisfies ProgressRecord}
              submitLabel="Save Record"
              onSubmit={saveEdit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

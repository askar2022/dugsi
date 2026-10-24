"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { ProgressForm, type ProgressPayload, type ProgressRecord, type ProgressStudent } from "@/components/portal/ProgressForm";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { placeLabel } from "@/lib/progress-compare";
import { PROGRESS_LABELS, PROGRESS_STATUSES, normalizeProgressStatus } from "@/lib/progress-status";

type SchoolClass = {
  id: string;
  name: string;
  teacherId?: string | null;
  teacher?: { id: string; name: string } | { id: string; name: string }[] | null;
};
type Progress = Omit<ProgressRecord, "student"> & {
  student?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    class?: { id?: string; name?: string; teacher?: { id?: string; name?: string } | { id?: string; name?: string }[] | null } | null;
  } | {
    id?: string;
    firstName?: string;
    lastName?: string;
    class?: { id?: string; name?: string; teacher?: { id?: string; name?: string } | { id?: string; name?: string }[] | null } | null;
  }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function studentOf(item: Progress) {
  return one(item.student);
}

function classOf(item: Progress) {
  return one(studentOf(item)?.class);
}

function teacherOf(item: Progress, classes: SchoolClass[]) {
  const fromStudent = one(classOf(item)?.teacher);
  if (fromStudent?.id) return fromStudent;
  const klass = classes.find((row) => row.id === classOf(item)?.id);
  return one(klass?.teacher);
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${month}. ${date.getDate()}`;
}

function studentName(item: Progress) {
  const student = studentOf(item);
  return student?.firstName ? `${student.firstName} ${student.lastName ?? ""}`.trim() : "Student";
}

function studentIdOf(item: Progress) {
  return item.studentId || studentOf(item)?.id || "";
}

export default function ViewProgressPage() {
  const [students, setStudents] = useState<ProgressStudent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState<Progress | null>(null);

  async function load() {
    const [studentData, classData, progressData] = await Promise.all([
      api<{ students: ProgressStudent[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ progress: Progress[] }>("/api/progress"),
    ]);
    setStudents(studentData.students);
    setClasses(classData.classes);
    setProgress(progressData.progress);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of classes) {
      const teacher = one(item.teacher);
      if (teacher?.id) map.set(teacher.id, teacher.name);
    }
    for (const item of progress) {
      const teacher = teacherOf(item, classes);
      if (teacher?.id && teacher.name) map.set(teacher.id, teacher.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [classes, progress]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return progress.filter((item) => {
      const tone = normalizeProgressStatus(item.status);
      const klass = classOf(item);
      const teacher = teacherOf(item, classes);
      if (classFilter && klass?.id !== classFilter) return false;
      if (teacherFilter && teacher?.id !== teacherFilter) return false;
      if (statusFilter && tone !== statusFilter) return false;
      if (dateFilter && item.date !== dateFilter) return false;
      if (!needle) return true;
      return `${studentName(item)} ${item.surah} ${item.juz ?? ""}`.toLowerCase().includes(needle);
    });
  }, [classFilter, classes, dateFilter, progress, query, statusFilter, teacherFilter]);

  async function saveEdit(payload: ProgressPayload) {
    if (!editing) return;
    await api(`/api/progress/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setEditing(null);
    await load();
  }

  const actions = (item: Progress) => {
    const id = studentIdOf(item);
    return (
      <div className="homework-mini-actions">
        {id ? <Link href={`/teacher/students/${id}`} className="btn btn-ghost">View Student</Link> : null}
        <button type="button" className="btn btn-ghost" onClick={() => setEditing(item)}>Edit</button>
      </div>
    );
  };

  return (
    <div className="page-stack">
      <h1 className="page-title">View Progress</h1>

      {progress.length === 0 ? (
        <div className="page-stack">
          <EmptyState title="No Quran progress yet" text="Record Juz, Surah, and ayah, then it will appear here." />
          <Link href="/teacher/progress/record" className="btn btn-primary" style={{ justifySelf: "start" }}>Record Progress</Link>
        </div>
      ) : (
        <>
          <section className="homework-toolbar">
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Student or Surah"
            />
          </section>
          <section className="progress-view-filters">
            <select className="select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="select" value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)}>
              <option value="">All teachers</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {PROGRESS_STATUSES.map((value) => (
                <option key={value} value={value}>{PROGRESS_LABELS[value]}</option>
              ))}
            </select>
            <input className="input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date" />
          </section>

          {rows.length === 0 ? (
            <EmptyState title="No matching records" text="Nothing matches that search or filter." />
          ) : (
            <>
              <div className="record-list progress-mobile">
                {rows.map((item) => {
                  const tone = normalizeProgressStatus(item.status);
                  return (
                    <article key={item.id} className={`card record-card-stack progress-row is-${tone}`}>
                      <p className="record-title">{studentName(item)}</p>
                      <p className="record-meta">{placeLabel(item)} · {shortDate(item.date)}</p>
                      <StatusBadge status={tone} />
                      {actions(item)}
                    </article>
                  );
                })}
              </div>
              <div className="progress-table-wrap progress-desktop">
                <table className="progress-table homework-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Juz</th>
                      <th>Surah</th>
                      <th>Ayah</th>
                      <th>Date</th>
                      <th>Progress</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const tone = normalizeProgressStatus(item.status);
                      return (
                        <tr key={item.id} className={`progress-row is-${tone}`}>
                          <td>{studentName(item)}</td>
                          <td>{item.juz ?? "—"}</td>
                          <td>{item.surah}</td>
                          <td>{item.ayahFrom}–{item.ayahTo}</td>
                          <td>{shortDate(item.date)}</td>
                          <td><StatusBadge status={tone} /></td>
                          <td>{actions(item)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {editing ? (
        <div className="homework-drawer" onClick={() => setEditing(null)}>
          <div className="homework-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="homework-drawer-top">
              <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Edit Progress</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Close</button>
            </div>
            <ProgressForm
              key={editing.id}
              students={students}
              progress={editing}
              submitLabel="Save Progress"
              onSubmit={saveEdit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

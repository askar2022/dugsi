"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAssessmentClass, needsClassPlacement } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { downloadTablePdf } from "@/lib/table-pdf";
import type { Session } from "@/lib/types";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId?: string | null;
  createdAt?: string | null;
  class?: {
    id: string;
    name: string;
    level: string | null;
    teacherId?: string | null;
    teacher?: { id: string; name: string } | null;
  } | null;
  parent?: { name: string; email: string } | null;
};

type Progress = {
  studentId: string;
  surah: string;
  juz: number | null;
  date: string;
  status?: string | null;
};

type SchoolClass = {
  id: string;
  name: string;
  level?: string | null;
  teacher?: { id: string; name: string } | null;
};

type Teacher = { id: string; name: string };

const PAGE_SIZE = 25;

function enrollmentYear(value?: string | null) {
  if (!value) return "";
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : "";
}

function quranLabel(progress?: Progress) {
  if (!progress) return "No Quran yet";
  return progress.juz ? `Juz ${progress.juz}` : progress.surah;
}

export default function StudentsRosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolName, setSchoolName] = useState("Students");
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [quranLevel, setQuranLevel] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [placeClass, setPlaceClass] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      const [studentData, progressData, classData, staffData, sessionData] = await Promise.all([
        api<{ students: Student[] }>("/api/students"),
        api<{ progress: Progress[] }>("/api/progress").catch(() => ({ progress: [] })),
        api<{ classes: SchoolClass[] }>("/api/classes"),
        api<{ teachers: Teacher[] }>("/api/staff"),
        api<{ user: Session }>("/api/auth/me"),
      ]);
      setStudents(
        studentData.students.map((student) => ({
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
      setClasses(classData.classes);
      setTeachers(staffData.teachers);
      setSchoolName(sessionData.user.tenantName ?? "Students");
    }
    load();
  }, []);

  const latestProgress = useMemo(() => {
    const map = new Map<string, Progress>();
    for (const item of progress) {
      if (!map.has(item.studentId)) map.set(item.studentId, item);
    }
    return map;
  }, [progress]);

  const quranOptions = useMemo(() => {
    const values = new Set<string>();
    for (const student of students) {
      values.add(quranLabel(latestProgress.get(student.id)));
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [latestProgress, students]);

  const yearOptions = useMemo(() => {
    const values = new Set(students.map((student) => enrollmentYear(student.createdAt)).filter(Boolean));
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [students]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const quran = quranLabel(latestProgress.get(student.id));
      const enrolledYear = enrollmentYear(student.createdAt);
      const teacher = student.class?.teacher;
      const haystack = [
        student.firstName,
        student.lastName,
        student.class?.name,
        student.parent?.name,
        student.status,
        quran,
        enrolledYear,
        teacher?.name,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (classId && student.class?.id !== classId) return false;
      if (teacherId && teacher?.id !== teacherId) return false;
      if (quranLevel && quran !== quranLevel) return false;
      if (year && enrolledYear !== year) return false;
      if (status === "waiting_assessment" && !needsClassPlacement(student)) return false;
      if (status === "enrolled" && needsClassPlacement(student)) return false;
      if (status && status !== "waiting_assessment" && status !== "enrolled" && student.status !== status) return false;
      return true;
    });
  }, [classId, latestProgress, quranLevel, query, status, students, teacherId, year]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filterParts = [
    classId ? classes.find((item) => item.id === classId)?.name : null,
    teacherId ? teachers.find((item) => item.id === teacherId)?.name : null,
    quranLevel || null,
    year ? `Enrolled ${year}` : null,
    status === "waiting_assessment" ? "Waiting for assessment" : status || null,
    query.trim() || null,
  ].filter(Boolean);

  function resetFilters() {
    setQuery("");
    setClassId("");
    setTeacherId("");
    setQuranLevel("");
    setYear("");
    setStatus("");
    setPage(1);
  }

  const realClasses = classes.filter((item) => !isAssessmentClass(item));

  async function place(studentId: string) {
    const nextClassId = placeClass[studentId];
    if (!nextClassId) {
      setError("Choose a class first.");
      return;
    }
    setBusy(studentId);
    setError("");
    try {
      await api(`/api/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "place", classId: nextClassId }),
      });
      const className = realClasses.find((item) => item.id === nextClassId)?.name ?? "class";
      setMessage(`Child placed in ${className}.`);
      const studentData = await api<{ students: Student[] }>("/api/students");
      setStudents(
        studentData.students.map((student) => ({
          ...student,
          class: student.class
            ? {
                ...student.class,
                teacher: Array.isArray(student.class.teacher) ? student.class.teacher[0] : student.class.teacher,
              }
            : null,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place that child.");
    } finally {
      setBusy("");
    }
  }

  function exportPdf() {
    downloadTablePdf({
      title: schoolName,
      subtitle: `Students${filterParts.length ? ` · ${filterParts.join(" · ")}` : " · All"}`,
      filename: "students-filtered.pdf",
      columns: [
        { key: "student", label: "Student", x: 36 },
        { key: "className", label: "Class", x: 160 },
        { key: "teacher", label: "Teacher", x: 270 },
        { key: "quran", label: "Quran", x: 380 },
        { key: "year", label: "Year", x: 460 },
        { key: "status", label: "Status", x: 510 },
      ],
      rows: rows.map((student) => ({
        student: `${student.firstName} ${student.lastName}`,
        className: student.class?.name ?? "—",
        teacher: student.class?.teacher?.name ?? "—",
        quran: quranLabel(latestProgress.get(student.id)),
        year: enrollmentYear(student.createdAt) || "—",
        status: student.status,
      })),
      footer: `${rows.length} student${rows.length === 1 ? "" : "s"} on this filtered list.`,
    });
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Students"
        description="Filter this dugsi’s children by class, teacher, Quran level, or year enrolled. Attendance details stay on Classes."
      />
      <section className="card" style={{ padding: "1.1rem 1.2rem", display: "grid", gap: "0.85rem" }}>
        <input
          className="input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search name, class, parent, or status"
        />
        <div className="teacher-filters" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Class</span>
            <select className="select" value={classId} onChange={(event) => { setClassId(event.target.value); setPage(1); }}>
              <option value="">All classes</option>
              {classes.filter((item) => !isAssessmentClass(item)).map((item) => (
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
            <span className="text-sm font-medium text-green">Quran level</span>
            <select className="select" value={quranLevel} onChange={(event) => { setQuranLevel(event.target.value); setPage(1); }}>
              <option value="">All Quran levels</option>
              {quranOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Year enrolled</span>
            <select className="select" value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}>
              <option value="">All years</option>
              {yearOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-green">Status</span>
            <select className="select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="waiting_assessment">Waiting for assessment</option>
              <option value="enrolled">Placed in a class</option>
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-late" style={{ margin: 0 }}>{error}</p> : null}
        {message ? <p className="text-sm text-paid" style={{ margin: 0 }}>{message}</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>Clear filters</button>
          <button type="button" className="btn btn-primary" onClick={exportPdf} disabled={rows.length === 0}>
            Export PDF
          </button>
          <p className="page-copy" style={{ margin: 0 }}>
            {rows.length === 0
              ? "No students match these filters."
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
          </p>
        </div>
      </section>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Teacher</th>
              <th>Quran</th>
              <th>Year</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6}>No students match. Review applications under Enrollment.</td>
              </tr>
            ) : (
              visible.map((student) => (
                <tr key={student.id}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>
                    {needsClassPlacement(student) ? (
                      <div style={{ display: "grid", gap: "0.4rem", minWidth: "11rem" }}>
                        <span>Waiting for assessment</span>
                        <select
                          className="select"
                          value={placeClass[student.id] ?? ""}
                          onChange={(event) => setPlaceClass((current) => ({ ...current, [student.id]: event.target.value }))}
                        >
                          <option value="">{realClasses.length ? "Choose a class" : "Add a class first"}</option>
                          {realClasses.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={Boolean(busy) || !placeClass[student.id]}
                          onClick={() => place(student.id)}
                        >
                          {busy === student.id ? "Placing..." : "Place in class"}
                        </button>
                      </div>
                    ) : (
                      student.class?.name ?? "—"
                    )}
                  </td>
                  <td>{student.class?.teacher?.name ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span>{quranLabel(latestProgress.get(student.id))}</span>
                      {latestProgress.get(student.id)?.status ? (
                        <StatusBadge status={latestProgress.get(student.id)?.status ?? "on_track"} />
                      ) : null}
                    </div>
                  </td>
                  <td>{enrollmentYear(student.createdAt) || "—"}</td>
                  <td><StatusBadge status={student.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > PAGE_SIZE ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn btn-ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Previous
          </button>
          <p className="page-copy" style={{ margin: 0 }}>Page {currentPage} of {pageCount}</p>
          <button className="btn btn-ghost" type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

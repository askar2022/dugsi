"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { HOMEWORK_KIND_LABELS, HOMEWORK_KINDS, homeworkCompletionCounts, type HomeworkKind } from "@/lib/homework";
import { SURAHS, juzFor, quranPortion, surahByName, surahByNumber } from "@/lib/quran";

type SchoolClass = { id: string; name: string };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  status?: string;
};
type Completion = {
  studentId: string;
  status: string;
  student: { firstName: string; lastName: string } | { firstName: string; lastName: string }[] | null;
};
type Homework = {
  id: string;
  title: string;
  kind?: string | null;
  surah?: string | null;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz?: number | null;
  description: string | null;
  assignedDate?: string | null;
  dueDate: string | null;
  studentId?: string | null;
  classId?: string;
  class: { id?: string; name: string } | { id?: string; name: string }[] | null;
  completions?: Completion[];
};

type StatusFilter = "all" | "assigned" | "done" | "needs_help";

const PAGE_SIZE = 12;
const today = () => new Date().toISOString().slice(0, 10);

function classOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function studentOf(completion: Completion) {
  const value = completion.student;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function studentName(completion: Completion) {
  const student = studentOf(completion);
  return student ? `${student.firstName} ${student.lastName}` : "Student";
}

export default function HomeworkPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [kind, setKind] = useState<HomeworkKind>("reading");
  const [surahNumber, setSurahNumber] = useState(1);
  const [ayahFrom, setAyahFrom] = useState(1);
  const [ayahTo, setAyahTo] = useState(7);
  const [assignedDate, setAssignedDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const surah = surahByNumber(surahNumber);
  const juz = surah ? juzFor(surah.number, ayahFrom) : null;

  async function load() {
    const [classData, studentData, homeworkData] = await Promise.all([
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ students: Student[] }>("/api/students"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]);
    setClasses(classData.classes);
    setStudents(studentData.students);
    setHomework(homeworkData.homework);
    setClassId((current) => current || classData.classes[0]?.id || "");
  }

  useEffect(() => {
    load();
  }, []);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.classId === classId &&
          student.status !== "unenrolled" &&
          student.status !== "declined",
      ),
    [students, classId],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return homework.filter((item) => {
      const klass = classOf(item);
      const completions = item.completions ?? [];
      const names = completions.map(studentName).join(" ");
      const haystack = [item.title, item.surah, item.description, item.kind, klass?.name, names].join(" ").toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (kindFilter && item.kind !== kindFilter) return false;
      if (studentFilter) {
        const forStudent = !item.studentId || item.studentId === studentFilter;
        const named = completions.some((row) => row.studentId === studentFilter);
        if (!forStudent && !named) return false;
      }
      if (statusFilter !== "all") {
        const match = completions.some((row) => row.status === statusFilter);
        if (!match) return false;
      }
      return true;
    });
  }, [homework, kindFilter, query, statusFilter, studentFilter]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setEditingId(null);
    setStudentId("");
    setKind("reading");
    setSurahNumber(1);
    setAyahFrom(1);
    setAyahTo(7);
    setAssignedDate(today());
    setDueDate("");
    setDescription("");
  }

  function startEdit(item: Homework) {
    const matched = surahByName(item.surah);
    setEditingId(item.id);
    setClassId(item.classId || classOf(item)?.id || classId);
    setStudentId(item.studentId || "all");
    setKind((item.kind as HomeworkKind) || "reading");
    setSurahNumber(matched?.number ?? 1);
    setAyahFrom(item.ayahFrom || 1);
    setAyahTo(item.ayahTo || matched?.ayahs || 7);
    setAssignedDate(item.assignedDate || today());
    setDueDate(item.dueDate || "");
    setDescription(item.description || "");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSurahChange(value: number) {
    const next = surahByNumber(value);
    setSurahNumber(value);
    setAyahFrom(1);
    setAyahTo(next?.ayahs ?? 1);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      classId,
      studentId,
      kind,
      surah: surah?.name,
      ayahFrom,
      ayahTo,
      juz,
      assignedDate,
      dueDate,
      description,
    };
    if (editingId) {
      await api(`/api/homework/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("/api/homework", { method: "POST", body: JSON.stringify(payload) });
    }
    resetForm();
    await load();
  }

  function resetFilters() {
    setQuery("");
    setKindFilter("");
    setStudentFilter("");
    setStatusFilter("all");
    setPage(1);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Homework"
        description="Assign Quran work, then edit the same card. Search and filter when the class is large."
      />
      {classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class before you send homework."
        />
      ) : (
        <form ref={formRef} onSubmit={onSubmit} className="card parent-form teacher-form homework-form">
          {editingId ? (
            <p className="homework-edit-note">Editing this assignment. Save changes instead of creating a new one.</p>
          ) : null}
          <FormField label="Class">
            <select
              className="select"
              required
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setStudentId("");
              }}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Assign to">
            <select className="select" required value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Choose who receives it</option>
              <option value="all">Whole class</option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </FormField>
          <div className="progress-tone">
            <FormField label="Homework type">
              <div className="mark-group">
                {HOMEWORK_KINDS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`mark-btn is-${value}${kind === value ? " is-active" : ""}`}
                    onClick={() => setKind(value)}
                  >
                    {HOMEWORK_KIND_LABELS[value]}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
          <FormField label="Juz">
            <input className="input" value={juz ? `Juz ${juz}` : "Shown when the Surah and ayah are set"} readOnly />
          </FormField>
          <FormField label="Surah">
            <select
              className="select"
              value={surahNumber}
              onChange={(event) => onSurahChange(Number(event.target.value))}
              required
            >
              {SURAHS.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}. {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Ayah from">
            <input
              className="input"
              type="number"
              min={1}
              max={surah?.ayahs ?? 1}
              value={ayahFrom}
              onChange={(event) => setAyahFrom(Number(event.target.value))}
              required
            />
          </FormField>
          <FormField label="Ayah to">
            <input
              className="input"
              type="number"
              min={ayahFrom}
              max={surah?.ayahs ?? 1}
              value={ayahTo}
              onChange={(event) => setAyahTo(Number(event.target.value))}
              required
            />
          </FormField>
          <FormField label="Assigned">
            <input className="input" type="date" value={assignedDate} onChange={(event) => setAssignedDate(event.target.value)} />
          </FormField>
          <FormField label="Due">
            <input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </FormField>
          <FormField label="Instructions">
            <textarea
              className="input parent-notes"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="How to practice this at home."
            />
          </FormField>
          <div className="homework-form-actions">
            {editingId ? (
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
            ) : null}
            <button className="btn btn-primary parent-form-submit">
              {editingId ? "Save changes" : "Assign homework"}
            </button>
          </div>
        </form>
      )}

      {homework.length === 0 ? (
        <EmptyState title="No homework yet" text="Assigned Quran work for your class will appear here." />
      ) : (
        <>
          <section className="card homework-filters">
            <input
              className="input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search Surah, student, or instructions"
            />
            <div className="teacher-filters homework-filter-grid">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-green">Type</span>
                <select className="select" value={kindFilter} onChange={(event) => { setKindFilter(event.target.value); setPage(1); }}>
                  <option value="">All types</option>
                  {HOMEWORK_KINDS.map((value) => (
                    <option key={value} value={value}>{HOMEWORK_KIND_LABELS[value]}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-green">Student</span>
                <select className="select" value={studentFilter} onChange={(event) => { setStudentFilter(event.target.value); setPage(1); }}>
                  <option value="">All students</option>
                  {students
                    .filter((student) => student.status !== "unenrolled" && student.status !== "declined")
                    .map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-green">Status</span>
                <select className="select" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setPage(1); }}>
                  <option value="all">All statuses</option>
                  <option value="assigned">Assigned</option>
                  <option value="done">Done</option>
                  <option value="needs_help">Needs help</option>
                </select>
              </label>
            </div>
            <div className="homework-filter-meta">
              <button type="button" className="btn btn-ghost" onClick={resetFilters}>Clear filters</button>
              <p className="page-copy" style={{ margin: 0 }}>
                {rows.length === 0
                  ? "No homework matches these filters."
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
              </p>
            </div>
          </section>
          <div className="record-list">
            {visible.map((item) => {
              const portion = quranPortion(item);
              const completions = (item.completions ?? []).filter((row) => !studentFilter || row.studentId === studentFilter);
              const counts = homeworkCompletionCounts(completions);
              const klass = classOf(item);
              const oneName = item.studentId
                ? studentName(completions.find((row) => row.studentId === item.studentId) ?? { studentId: item.studentId, status: "assigned", student: null })
                : null;
              const open = openId === item.id;
              return (
                <article key={item.id} className="card homework-card">
                  <div className="homework-card-top">
                    <StatusBadge status={item.kind || "reading"} />
                    <button type="button" className="btn btn-ghost homework-edit-btn" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                  </div>
                  {portion ? <p className="homework-portion">{portion}</p> : <p className="record-title">{item.title}</p>}
                  <p className="record-meta">
                    {oneName ?? "Whole class"}
                    {klass?.name ? ` · ${klass.name}` : ""}
                    {item.dueDate ? ` · due ${item.dueDate}` : ""}
                  </p>
                  {item.description ? <p className="record-body">{item.description}</p> : null}
                  <div className="homework-summary">
                    <span>{counts.done} done</span>
                    <span>{counts.needsHelp} need help</span>
                    <span>{counts.assigned} waiting</span>
                  </div>
                  {completions.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost homework-toggle"
                        onClick={() => setOpenId(open ? null : item.id)}
                      >
                        {open ? "Hide students" : `Show ${completions.length} student${completions.length === 1 ? "" : "s"}`}
                      </button>
                      {open ? (
                        <div className="homework-status-list">
                          {completions.map((row) => (
                            <div key={row.studentId} className="homework-status-row">
                              <span>{studentName(row)}</span>
                              <StatusBadge status={row.status} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
          {rows.length > PAGE_SIZE ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <button className="btn btn-ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <button className="btn btn-ghost" type="button" disabled={currentPage * PAGE_SIZE >= rows.length} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

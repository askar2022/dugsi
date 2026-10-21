"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { HOMEWORK_KIND_LABELS, HOMEWORK_KINDS, type HomeworkKind } from "@/lib/homework";
import { SURAHS, juzFor, quranPortion, surahByNumber } from "@/lib/quran";

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
  dueDate: string | null;
  studentId?: string | null;
  class: { name: string } | { name: string }[] | null;
  completions?: Completion[];
};

function classNameOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

function studentOf(completion: Completion) {
  const value = completion.student;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function HomeworkPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classId, setClassId] = useState("");
  const [kind, setKind] = useState<HomeworkKind>("reading");
  const [surahNumber, setSurahNumber] = useState(1);
  const [ayahFrom, setAyahFrom] = useState(1);
  const [ayahTo, setAyahTo] = useState(7);

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

  function onSurahChange(value: number) {
    const next = surahByNumber(value);
    setSurahNumber(value);
    setAyahFrom(1);
    setAyahTo(next?.ayahs ?? 1);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/homework", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        kind,
        surah: surah?.name,
        ayahFrom,
        ayahTo,
        juz,
      }),
    });
    form.reset();
    setKind("reading");
    setSurahNumber(1);
    setAyahFrom(1);
    setAyahTo(7);
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Homework"
        description="Assign Quran reading, memorization, review, or written work to a class or one student."
      />
      {classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class before you send homework."
        />
      ) : (
        <form onSubmit={onSubmit} className="card parent-form teacher-form homework-form">
          <FormField label="Class">
            <select
              className="select"
              name="classId"
              required
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Assign to">
            <select key={classId} className="select" name="studentId" required>
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
          <FormField label="Juz">
            <input className="input" value={juz ? `Juz ${juz}` : "Shown when the Surah and ayah are set"} readOnly />
          </FormField>
          <FormField label="Assigned">
            <input className="input" name="assignedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </FormField>
          <FormField label="Due"><input className="input" name="dueDate" type="date" /></FormField>
          <FormField label="Instructions">
            <textarea className="input parent-notes" name="description" rows={3} placeholder="How to practice this at home." />
          </FormField>
          <button className="btn btn-primary parent-form-submit">Assign homework</button>
        </form>
      )}
      {homework.length === 0 ? (
        <EmptyState title="No homework yet" text="Assigned Quran work for your class will appear here." />
      ) : (
        <div className="record-list">
          {homework.map((item) => {
            const portion = quranPortion(item);
            const completions = item.completions ?? [];
            return (
              <article key={item.id} className="card record-card-stack homework-card">
                <div className="homework-card-top">
                  <StatusBadge status={item.kind || "reading"} />
                  {item.dueDate ? <p className="record-meta">Due {item.dueDate}</p> : null}
                </div>
                <p className="record-title">{item.title}</p>
                {portion ? <p className="homework-portion">{portion}</p> : null}
                <p className="record-meta">
                  {item.studentId ? "One student" : "Whole class"}
                  {classNameOf(item) ? ` · ${classNameOf(item)}` : ""}
                </p>
                {item.description ? <p className="record-body">{item.description}</p> : null}
                {completions.length > 0 ? (
                  <div className="homework-status-list">
                    {completions.map((row) => {
                      const student = studentOf(row);
                      return (
                        <div key={row.studentId} className="homework-status-row">
                          <span>{student ? `${student.firstName} ${student.lastName}` : "Student"}</span>
                          <StatusBadge status={row.status} />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

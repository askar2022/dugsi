"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string };
type Progress = {
  id: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number | null;
  date: string;
  student: { firstName: string; lastName: string };
};

export default function ProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);

  async function load() {
    const [studentData, progressData] = await Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ progress: Progress[] }>("/api/progress"),
    ]);
    setStudents(studentData.students);
    setProgress(progressData.progress);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    await api("/api/progress", {
      method: "POST",
      body: JSON.stringify({
        ...raw,
        ayahFrom: Number(raw.ayahFrom),
        ayahTo: Number(raw.ayahTo),
        juz: raw.juz ? Number(raw.juz) : undefined,
      }),
    });
    form.reset();
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Quran progress" description="Record the Surah, Juz, and Ayah range a student has reached." />
      {students.length === 0 ? (
        <EmptyState
          title="No students in your class"
          text="Ask the office to assign you a class and place students in it."
        />
      ) : (
        <form onSubmit={onSubmit} className="card parent-form teacher-form">
          <FormField label="Student">
            <select className="select" name="studentId" required>
              <option value="">Choose a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Surah"><input className="input" name="surah" required /></FormField>
          <FormField label="Juz"><input className="input" name="juz" type="number" min={1} max={30} /></FormField>
          <FormField label="Ayah from"><input className="input" name="ayahFrom" type="number" required /></FormField>
          <FormField label="Ayah to"><input className="input" name="ayahTo" type="number" required /></FormField>
          <FormField label="Date"><input className="input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></FormField>
          <button className="btn btn-primary parent-form-submit">Save progress</button>
        </form>
      )}
      {progress.length === 0 ? (
        <EmptyState
          title="No Quran progress yet"
          text="Saved records will show Surah, Juz, and Ayah range here."
        />
      ) : (
        <>
          <div className="record-list progress-mobile">
            {progress.map((item) => (
              <article key={item.id} className="card record-card-stack">
                <p className="record-title">{item.student.firstName} {item.student.lastName}</p>
                <p className="record-meta">
                  Surah {item.surah}
                  {item.juz ? ` · Juz ${item.juz}` : ""}
                  {` · Ayah ${item.ayahFrom}–${item.ayahTo}`}
                  {` · ${item.date}`}
                </p>
              </article>
            ))}
          </div>
          <div className="card table-wrap p-2 progress-desktop">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Surah</th>
                  <th>Juz</th>
                  <th>Ayah</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student.firstName} {item.student.lastName}</td>
                    <td>{item.surah}</td>
                    <td>{item.juz ?? "—"}</td>
                    <td>{item.ayahFrom}–{item.ayahTo}</td>
                    <td>{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

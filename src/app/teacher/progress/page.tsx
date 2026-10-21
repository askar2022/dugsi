"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string };
type Progress = {
  id: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
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
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/progress", {
      method: "POST",
      body: JSON.stringify({
        ...raw,
        ayahFrom: Number(raw.ayahFrom),
        ayahTo: Number(raw.ayahTo),
        juz: raw.juz ? Number(raw.juz) : undefined,
      }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Quran progress" description="Record the verses a student has reached." />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Student">
          <select className="select" name="studentId" required>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Surah"><input className="input" name="surah" required /></FormField>
        <FormField label="Ayah from"><input className="input" name="ayahFrom" type="number" required /></FormField>
        <FormField label="Ayah to"><input className="input" name="ayahTo" type="number" required /></FormField>
        <FormField label="Juz"><input className="input" name="juz" type="number" /></FormField>
        <FormField label="Date"><input className="input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Save progress</button>
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Surah</th>
              <th>Ayah</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((item) => (
              <tr key={item.id}>
                <td>{item.student.firstName} {item.student.lastName}</td>
                <td>{item.surah}</td>
                <td>{item.ayahFrom}-{item.ayahTo}</td>
                <td>{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { PROGRESS_LABELS, PROGRESS_STATUSES, normalizeProgressStatus, type ProgressStatus } from "@/lib/progress-status";

type Student = { id: string; firstName: string; lastName: string };
type Progress = {
  id: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number | null;
  date: string;
  status?: string | null;
  student: { firstName: string; lastName: string } | { firstName: string; lastName: string }[] | null;
};

function studentOf(item: Progress) {
  const value = item.student;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function ProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [status, setStatus] = useState<ProgressStatus>("on_track");
  const [busyId, setBusyId] = useState("");

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
        status,
      }),
    });
    form.reset();
    setStatus("on_track");
    await load();
  }

  async function setRowStatus(id: string, next: ProgressStatus) {
    setBusyId(id);
    try {
      await api(`/api/progress/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Quran progress"
        description="Green is on track, yellow needs practice, red means contact the parent. Red sends an email."
      />
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
          <FormField label="Juz"><input className="input" name="juz" type="number" min={1} max={30} /></FormField>
          <FormField label="Surah"><input className="input" name="surah" required /></FormField>
          <FormField label="Ayah from"><input className="input" name="ayahFrom" type="number" required /></FormField>
          <FormField label="Ayah to"><input className="input" name="ayahTo" type="number" required /></FormField>
          <FormField label="Date"><input className="input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></FormField>
          <div className="progress-tone">
          <FormField label="Progress">
            <div className="mark-group">
              {PROGRESS_STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`mark-btn is-${value}${status === value ? " is-active" : ""}`}
                  onClick={() => setStatus(value)}
                >
                  {PROGRESS_LABELS[value]}
                </button>
              ))}
            </div>
          </FormField>
          </div>
          <button className="btn btn-primary parent-form-submit">Save progress</button>
        </form>
      )}
      {progress.length === 0 ? (
        <EmptyState
          title="No Quran progress yet"
          text="Saved records will show Surah, Juz, Ayah range, and color here."
        />
      ) : (
        <>
          <div className="record-list progress-mobile">
            {progress.map((item) => {
              const student = studentOf(item);
              const tone = normalizeProgressStatus(item.status);
              return (
                <article key={item.id} className={`card record-card-stack progress-row is-${tone}`}>
                  <p className="record-title">{student ? `${student.firstName} ${student.lastName}` : "Student"}</p>
                  <p className="record-meta">
                    {item.juz ? `Juz ${item.juz} · ` : ""}
                    Surah {item.surah}
                    {` · Ayah ${item.ayahFrom}–${item.ayahTo}`}
                    {` · ${item.date}`}
                  </p>
                  <StatusBadge status={tone} />
                  <div className="mark-group" style={{ marginTop: "0.7rem" }}>
                    {PROGRESS_STATUSES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`mark-btn is-${value}${tone === value ? " is-active" : ""}`}
                        disabled={busyId === item.id}
                        onClick={() => setRowStatus(item.id, value)}
                      >
                        {PROGRESS_LABELS[value]}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="card table-wrap p-2 progress-desktop">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Juz</th>
                  <th>Surah</th>
                  <th>Ayah</th>
                  <th>Date</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((item) => {
                  const student = studentOf(item);
                  const tone = normalizeProgressStatus(item.status);
                  return (
                    <tr key={item.id} className={`progress-row is-${tone}`}>
                      <td>{student ? `${student.firstName} ${student.lastName}` : "Student"}</td>
                      <td>{item.juz ?? "—"}</td>
                      <td>{item.surah}</td>
                      <td>{item.ayahFrom}–{item.ayahTo}</td>
                      <td>{item.date}</td>
                      <td>
                        <div className="mark-group">
                          {PROGRESS_STATUSES.map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={`mark-btn is-${value}${tone === value ? " is-active" : ""}`}
                              disabled={busyId === item.id}
                              onClick={() => setRowStatus(item.id, value)}
                            >
                              {PROGRESS_LABELS[value]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

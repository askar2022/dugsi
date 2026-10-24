"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StudentPicker } from "@/components/portal/StudentPicker";
import { api } from "@/lib/api";
import { PROGRESS_LABELS, PROGRESS_STATUSES, normalizeProgressStatus, type ProgressStatus } from "@/lib/progress-status";
import { placeLabel } from "@/lib/progress-compare";
import { SURAHS, juzFor, surahByNumber } from "@/lib/quran";

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
  const [studentId, setStudentId] = useState("");
  const [surahNumber, setSurahNumber] = useState(1);
  const [ayahFrom, setAyahFrom] = useState(1);
  const [ayahTo, setAyahTo] = useState(7);
  const [status, setStatus] = useState<ProgressStatus>("on_track");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const surah = surahByNumber(surahNumber);
  const juz = surah ? juzFor(surah.number, ayahFrom) : 1;

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

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return progress.filter((item) => {
      if (!needle) return true;
      const student = studentOf(item);
      return `${student?.firstName ?? ""} ${student?.lastName ?? ""} ${item.surah}`.toLowerCase().includes(needle);
    });
  }, [progress, query]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    await api("/api/progress", {
      method: "POST",
      body: JSON.stringify({
        studentId,
        surah: surah?.name,
        ayahFrom,
        ayahTo,
        juz,
        date,
        status,
      }),
    });
    setStudentId("");
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
        description="Tap a child, then Juz, Surah, and ayah. Green, yellow, or red."
      />
      {students.length === 0 ? (
        <EmptyState
          title="No students in your class"
          text="Ask the office to assign you a class and place students in it."
        />
      ) : (
        <form onSubmit={onSubmit} className="card parent-form teacher-form">
          <div className="progress-tone block space-y-2">
            <span className="text-sm font-medium text-green">Student</span>
            <StudentPicker students={students} value={studentId} onChange={setStudentId} />
          </div>
          <FormField label="Juz">
            <input className="input" value={`Juz ${juz}`} readOnly />
          </FormField>
          <FormField label="Surah">
            <select
              className="select"
              value={surahNumber}
              onChange={(event) => {
                const next = Number(event.target.value);
                const item = surahByNumber(next);
                setSurahNumber(next);
                setAyahFrom(1);
                setAyahTo(item?.ayahs ?? 1);
              }}
            >
              {SURAHS.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}. {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Ayah from">
            <input className="input" type="number" min={1} max={surah?.ayahs ?? 1} value={ayahFrom} onChange={(event) => setAyahFrom(Number(event.target.value))} required />
          </FormField>
          <FormField label="Ayah to">
            <input className="input" type="number" min={ayahFrom} max={surah?.ayahs ?? 1} value={ayahTo} onChange={(event) => setAyahTo(Number(event.target.value))} required />
          </FormField>
          <FormField label="Date">
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FormField>
          <FormField label="Progress">
            <select
              className={`select progress-status-select is-${status}`}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProgressStatus)}
            >
              {PROGRESS_STATUSES.map((value) => (
                <option key={value} value={value}>{PROGRESS_LABELS[value]}</option>
              ))}
            </select>
          </FormField>
          <button className="btn btn-primary parent-form-submit" disabled={!studentId}>Save progress</button>
        </form>
      )}
      {progress.length === 0 ? (
        <EmptyState
          title="No Quran progress yet"
          text="Saved records will show Surah, Juz, Ayah range, and color here."
        />
      ) : (
        <>
          {progress.length > 6 ? (
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a student or Surah"
            />
          ) : null}
          <div className="record-list progress-mobile">
            {rows.map((item) => {
              const student = studentOf(item);
              const tone = normalizeProgressStatus(item.status);
              return (
                <article key={item.id} className={`card record-card-stack progress-row is-${tone}`}>
                  <p className="record-title">{student ? `${student.firstName} ${student.lastName}` : "Student"}</p>
                  <p className="record-meta">
                    {placeLabel(item)} · {item.date}
                  </p>
                  <select
                    className={`select progress-status-select is-${tone}`}
                    value={tone}
                    disabled={busyId === item.id}
                    onChange={(event) => setRowStatus(item.id, event.target.value as ProgressStatus)}
                  >
                    {PROGRESS_STATUSES.map((value) => (
                      <option key={value} value={value}>{PROGRESS_LABELS[value]}</option>
                    ))}
                  </select>
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
                {rows.map((item) => {
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
                        <select
                          className={`select progress-status-select is-${tone}`}
                          value={tone}
                          disabled={busyId === item.id}
                          onChange={(event) => setRowStatus(item.id, event.target.value as ProgressStatus)}
                        >
                          {PROGRESS_STATUSES.map((value) => (
                            <option key={value} value={value}>{PROGRESS_LABELS[value]}</option>
                          ))}
                        </select>
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

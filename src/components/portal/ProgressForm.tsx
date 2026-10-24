"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { StudentPicker } from "@/components/portal/StudentPicker";
import { PROGRESS_LABELS, PROGRESS_STATUSES, normalizeProgressStatus, type ProgressStatus } from "@/lib/progress-status";
import { SURAHS, juzFor, surahByName, surahByNumber } from "@/lib/quran";

export type ProgressStudent = { id: string; firstName: string; lastName: string };
export type ProgressRecord = {
  id: string;
  studentId?: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number | null;
  date: string;
  status?: string | null;
  student?: { id?: string } | { id?: string }[] | null;
};

export type ProgressPayload = {
  studentId: string;
  surah?: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number;
  date: string;
  status: ProgressStatus;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function studentIdOf(item?: ProgressRecord | null) {
  if (!item) return "";
  const value = item.student;
  const student = Array.isArray(value) ? value[0] ?? null : value;
  return item.studentId || student?.id || "";
}

function valuesFrom(item?: ProgressRecord | null) {
  if (!item) {
    return {
      studentId: "",
      juz: juzFor(1, 1),
      surahNumber: 1,
      ayahFrom: 1,
      ayahTo: 7,
      status: "on_track" as ProgressStatus,
      date: today(),
    };
  }
  const matched = surahByName(item.surah);
  return {
    studentId: studentIdOf(item),
    juz: item.juz || (matched ? juzFor(matched.number, item.ayahFrom || 1) : 1),
    surahNumber: matched?.number ?? 1,
    ayahFrom: item.ayahFrom || 1,
    ayahTo: item.ayahTo || matched?.ayahs || 7,
    status: normalizeProgressStatus(item.status),
    date: item.date || today(),
  };
}

export function ProgressForm({
  students,
  progress,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  students: ProgressStudent[];
  progress?: ProgressRecord | null;
  submitLabel: string;
  onSubmit: (payload: ProgressPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const initial = valuesFrom(progress);
  const [studentId, setStudentId] = useState(initial.studentId);
  const [juz, setJuz] = useState(initial.juz);
  const [surahNumber, setSurahNumber] = useState(initial.surahNumber);
  const [ayahFrom, setAyahFrom] = useState(initial.ayahFrom);
  const [ayahTo, setAyahTo] = useState(initial.ayahTo);
  const [status, setStatus] = useState<ProgressStatus>(initial.status);
  const [date, setDate] = useState(initial.date);
  const [busy, setBusy] = useState(false);
  const surah = surahByNumber(surahNumber);

  function onSurahChange(value: number) {
    const next = surahByNumber(value);
    setSurahNumber(value);
    setAyahFrom(1);
    setAyahTo(next?.ayahs ?? 1);
    setJuz(next ? juzFor(next.number, 1) : juz);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    setBusy(true);
    try {
      await onSubmit({
        studentId,
        surah: surah?.name,
        ayahFrom,
        ayahTo,
        juz,
        date,
        status,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={onCancel ? "homework-drawer-form" : "card parent-form teacher-form"} onSubmit={handleSubmit}>
      <FormField label="Select Student">
        <StudentPicker students={students} value={studentId} onChange={setStudentId} />
      </FormField>
      <FormField label="Juz">
        <input className="input" type="number" min={1} max={30} value={juz} onChange={(event) => setJuz(Number(event.target.value))} />
      </FormField>
      <FormField label="Surah">
        <select className="select" value={surahNumber} onChange={(event) => onSurahChange(Number(event.target.value))} required>
          {SURAHS.map((item) => (
            <option key={item.number} value={item.number}>{item.number}. {item.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Ayah From">
        <input
          className="input"
          type="number"
          min={1}
          max={surah?.ayahs ?? 1}
          value={ayahFrom}
          onChange={(event) => {
            const next = Number(event.target.value);
            setAyahFrom(next);
            setJuz(juzFor(surahNumber, next || 1));
          }}
          required
        />
      </FormField>
      <FormField label="Ayah To">
        <input className="input" type="number" min={ayahFrom} max={surah?.ayahs ?? 1} value={ayahTo} onChange={(event) => setAyahTo(Number(event.target.value))} required />
      </FormField>
      <FormField label="Progress Status">
        <select
          className="select"
          value={status}
          onChange={(event) => setStatus(event.target.value as ProgressStatus)}
        >
          {PROGRESS_STATUSES.map((value) => (
            <option key={value} value={value}>{PROGRESS_LABELS[value]}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Date">
        <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </FormField>
      <div className="homework-form-actions">
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        ) : null}
        <button className="btn btn-primary" disabled={!studentId || busy}>{submitLabel}</button>
      </div>
    </form>
  );
}

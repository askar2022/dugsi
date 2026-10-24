"use client";

import { FormEvent, useMemo, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { StudentPicker } from "@/components/portal/StudentPicker";
import { HOMEWORK_KIND_LABELS, HOMEWORK_KINDS, type HomeworkKind } from "@/lib/homework";
import { SURAHS, juzFor, surahByName, surahByNumber } from "@/lib/quran";

export type HomeworkClass = { id: string; name: string };
export type HomeworkStudent = {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  status?: string;
};
export type HomeworkRecord = {
  id: string;
  kind?: string | null;
  surah?: string | null;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz?: number | null;
  description?: string | null;
  dueDate?: string | null;
  studentId?: string | null;
  classId?: string;
  class?: { id?: string; name: string } | { id?: string; name: string }[] | null;
  completions?: Array<{ studentId: string; status?: string; student?: unknown }>;
};

export type HomeworkPayload = {
  classId: string;
  studentId: string;
  studentIds: string[];
  kind: HomeworkKind;
  surah?: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number;
  dueDate: string;
  description: string;
};

type AssignMode = "class" | "selected" | "individual";

function classIdOf(item: HomeworkRecord) {
  const value = item.class;
  const klass = Array.isArray(value) ? value[0] ?? null : value;
  return item.classId || klass?.id || "";
}

function enrolledStudents(students: HomeworkStudent[], classId: string) {
  return students.filter(
    (student) =>
      student.classId === classId &&
      student.status !== "unenrolled" &&
      student.status !== "declined" &&
      student.status !== "waiting_assessment" &&
      student.status !== "pending",
  );
}

function valuesFrom(item: HomeworkRecord | null | undefined, students: HomeworkStudent[], fallbackClassId: string) {
  if (!item) {
    return {
      classId: fallbackClassId,
      assignMode: "class" as AssignMode,
      studentId: "",
      selectedIds: [] as string[],
      kind: "reading" as HomeworkKind,
      juz: juzFor(1, 1),
      surahNumber: 1,
      ayahFrom: 1,
      ayahTo: 7,
      dueDate: "",
      description: "",
    };
  }
  const nextClassId = classIdOf(item) || fallbackClassId;
  const enrolled = enrolledStudents(students, nextClassId);
  const completions = item.completions ?? [];
  const matched = surahByName(item.surah);
  let assignMode: AssignMode = "class";
  let studentId = "";
  let selectedIds: string[] = [];
  if (item.studentId) {
    assignMode = "individual";
    studentId = item.studentId;
    selectedIds = [item.studentId];
  } else if (completions.length && completions.length < enrolled.length) {
    assignMode = "selected";
    selectedIds = completions.map((row) => row.studentId);
  }
  return {
    classId: nextClassId,
    assignMode,
    studentId,
    selectedIds,
    kind: (item.kind as HomeworkKind) || "reading",
    juz: item.juz || (matched ? juzFor(matched.number, item.ayahFrom || 1) : 1),
    surahNumber: matched?.number ?? 1,
    ayahFrom: item.ayahFrom || 1,
    ayahTo: item.ayahTo || matched?.ayahs || 7,
    dueDate: item.dueDate || "",
    description: item.description || "",
  };
}

export function HomeworkForm({
  classes,
  students,
  homework,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  classes: HomeworkClass[];
  students: HomeworkStudent[];
  homework?: HomeworkRecord | null;
  submitLabel: string;
  onSubmit: (payload: HomeworkPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const fallbackClassId = classes[0]?.id || "";
  const initial = valuesFrom(homework, students, homework ? classIdOf(homework) || fallbackClassId : fallbackClassId);
  const [classId, setClassId] = useState(initial.classId || fallbackClassId);
  const [assignMode, setAssignMode] = useState<AssignMode>(initial.assignMode);
  const [studentId, setStudentId] = useState(initial.studentId);
  const [selectedIds, setSelectedIds] = useState<string[]>(initial.selectedIds);
  const [kind, setKind] = useState<HomeworkKind>(initial.kind);
  const [juz, setJuz] = useState(initial.juz);
  const [surahNumber, setSurahNumber] = useState(initial.surahNumber);
  const [ayahFrom, setAyahFrom] = useState(initial.ayahFrom);
  const [ayahTo, setAyahTo] = useState(initial.ayahTo);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [description, setDescription] = useState(initial.description);
  const [busy, setBusy] = useState(false);
  const surah = surahByNumber(surahNumber);
  const classStudents = useMemo(() => enrolledStudents(students, classId), [students, classId]);

  function onSurahChange(value: number) {
    const next = surahByNumber(value);
    setSurahNumber(value);
    setAyahFrom(1);
    setAyahTo(next?.ayahs ?? 1);
    setJuz(next ? juzFor(next.number, 1) : juz);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function resetBlank() {
    setAssignMode("class");
    setStudentId("");
    setSelectedIds([]);
    setKind("reading");
    setSurahNumber(1);
    setAyahFrom(1);
    setAyahTo(7);
    setJuz(juzFor(1, 1));
    setDueDate("");
    setDescription("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        classId,
        studentId: assignMode === "individual" ? studentId : "all",
        studentIds: assignMode === "selected" ? selectedIds : assignMode === "individual" && studentId ? [studentId] : [],
        kind,
        surah: surah?.name,
        ayahFrom,
        ayahTo,
        juz,
        dueDate,
        description,
      });
      if (!homework) resetBlank();
    } finally {
      setBusy(false);
    }
  }

  const canSave =
    Boolean(classId) &&
    (assignMode === "class" || (assignMode === "individual" && studentId) || (assignMode === "selected" && selectedIds.length > 0));

  return (
    <form className={onCancel ? "homework-drawer-form" : "card parent-form teacher-form"} onSubmit={handleSubmit}>
      <FormField label="Class">
        <select
          className="select"
          required
          value={classId}
          onChange={(event) => {
            setClassId(event.target.value);
            setStudentId("");
            setSelectedIds([]);
          }}
        >
          {classes.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Assign To">
        <select className="select" value={assignMode} onChange={(event) => setAssignMode(event.target.value as AssignMode)}>
          <option value="class">Whole Class</option>
          <option value="selected">Selected Students</option>
          <option value="individual">Individual Student</option>
        </select>
      </FormField>
      {assignMode === "individual" ? (
        <FormField label="Student">
          <StudentPicker students={classStudents} value={studentId} onChange={setStudentId} />
        </FormField>
      ) : null}
      {assignMode === "selected" ? (
        <div className="block space-y-2" style={{ gridColumn: "1 / -1" }}>
          <span className="text-sm font-medium text-green">Students</span>
          <div className="homework-pick-list">
            {classStudents.map((student) => (
              <label key={student.id} className="homework-pick">
                <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelected(student.id)} />
                {student.firstName} {student.lastName}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <FormField label="Homework Type">
        <select className="select" value={kind} onChange={(event) => setKind(event.target.value as HomeworkKind)}>
          {HOMEWORK_KINDS.map((value) => (
            <option key={value} value={value}>{HOMEWORK_KIND_LABELS[value]}</option>
          ))}
        </select>
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
      <FormField label="Due Date">
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
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        ) : null}
        <button className="btn btn-primary" disabled={!canSave || busy}>{submitLabel}</button>
      </div>
    </form>
  );
}

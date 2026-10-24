"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string; classId: string | null };
type SchoolClass = {
  id: string;
  name: string;
  level?: string | null;
  teacherId?: string | null;
  teacher?: { id: string; name: string } | { id: string; name: string }[] | null;
};
type Attendance = { studentId: string; status: string };
type Mark = "present" | "absent" | "late" | "excused";

const MARKS: Array<{ value: Mark; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function teacherOf(item: SchoolClass) {
  const value = item.teacher;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function AttendanceBoard({ showTeacherFilter }: { showTeacherFilter: boolean }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [query, setQuery] = useState("");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ])
      .then(([studentData, classData]) => {
        const visible = classData.classes
          .filter((item) => !isAssessmentClass(item))
          .map((item) => ({ ...item, teacher: teacherOf(item) }));
        setStudents(studentData.students);
        setClasses(visible);
        setClassId((current) => current || visible[0]?.id || "");
      })
      .finally(() => setReady(true));
  }, []);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of classes) {
      const teacher = teacherOf(item);
      if (teacher?.id) map.set(teacher.id, teacher.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const classOptions = useMemo(
    () => classes.filter((item) => !teacherId || item.teacherId === teacherId || teacherOf(item)?.id === teacherId),
    [classes, teacherId],
  );

  const selectedClass = classes.find((item) => item.id === classId) ?? null;
  const selectedTeacher = selectedClass ? teacherOf(selectedClass) : null;

  const roster = useMemo(
    () => students.filter((student) => student.classId === classId),
    [classId, students],
  );

  const entered = roster.some((student) => marks[student.id]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roster.filter((student) => {
      const mark = marks[student.id];
      if (exceptionsOnly && (!mark || mark === "present")) return false;
      if (!needle) return true;
      return `${student.firstName} ${student.lastName}`.toLowerCase().includes(needle);
    });
  }, [exceptionsOnly, marks, query, roster]);

  useEffect(() => {
    if (!classId || !date) return;
    api<{ attendance: Attendance[] }>(`/api/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`)
      .then((data) => {
        const next: Record<string, Mark> = {};
        for (const row of data.attendance) {
          next[row.studentId] = row.status as Mark;
        }
        setMarks(next);
        setExceptionsOnly(false);
      })
      .catch(() => setMarks({}));
  }, [classId, date]);

  function chooseClass(nextClassId: string) {
    setClassId(nextClassId);
    const next = classes.find((item) => item.id === nextClassId);
    const teacher = next ? teacherOf(next) : null;
    if (showTeacherFilter && teacher?.id) setTeacherId(teacher.id);
  }

  function chooseTeacher(nextTeacherId: string) {
    setTeacherId(nextTeacherId);
    const nextClasses = classes.filter((item) => !nextTeacherId || item.teacherId === nextTeacherId || teacherOf(item)?.id === nextTeacherId);
    if (!nextClasses.some((item) => item.id === classId)) {
      setClassId(nextClasses[0]?.id || "");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!classId) return;
    await api("/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        classId,
        date,
        marks: roster.map((student) => ({
          studentId: student.id,
          status: marks[student.id] ?? "present",
        })),
      }),
    });
    setMessage("Attendance saved.");
  }

  return (
    <form onSubmit={onSubmit} className="page-stack">
      <PageHeader
        title="Attendance"
        description="Mark the class present, then change only absent, late, or excused students."
      />
      <div className="card parent-form">
        <div className={showTeacherFilter ? "attend-filters" : "teacher-filters"}>
          {showTeacherFilter ? (
            <FormField label="Teacher">
              <select className="select" value={teacherId} onChange={(event) => chooseTeacher(event.target.value)}>
                <option value="">All teachers</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField label="Class">
            <select className="select" value={classId} onChange={(event) => chooseClass(event.target.value)} required>
              <option value="">{ready && classOptions.length === 0 ? "No assigned class yet" : "Choose a class"}</option>
              {classOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FormField>
        </div>
        {selectedTeacher?.name && !showTeacherFilter ? (
          <p className="record-meta">Teacher: {selectedTeacher.name}</p>
        ) : null}
        {roster.length > 0 ? (
          <>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a student"
            />
            <div className="attend-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const next: Record<string, Mark> = {};
                  for (const student of roster) next[student.id] = "present";
                  setMarks(next);
                }}
              >
                Mark all present
              </button>
              {entered ? (
                <label className="attend-exceptions">
                  <input type="checkbox" checked={exceptionsOnly} onChange={(event) => setExceptionsOnly(event.target.checked)} />
                  Show exceptions only
                </label>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      {!ready ? (
        <EmptyState title="Loading" text="Loading the class roster." />
      ) : classOptions.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text={showTeacherFilter ? "Add a class first." : "Ask the office to assign you a class. You will only see students in your own class."}
        />
      ) : !classId ? (
        <EmptyState title="Choose a class" text="Select a class to see the roster." />
      ) : roster.length === 0 ? (
        <EmptyState title="No students in this class" text="The office still needs to place students in this class." />
      ) : visible.length === 0 ? (
        <EmptyState
          title={exceptionsOnly ? "No exceptions" : "No match"}
          text={exceptionsOnly ? "Everyone marked is present." : "No student matches that name."}
        />
      ) : (
        <div className="attend-list">
          {visible.map((student) => {
            const value = marks[student.id] ?? "present";
            return (
              <label key={student.id} className="attend-row">
                <span className="attend-name">{student.firstName} {student.lastName}</span>
                <select
                  className={`attend-select is-${value}`}
                  aria-label={`Attendance for ${student.firstName} ${student.lastName}`}
                  value={value}
                  onChange={(event) => setMarks((current) => ({ ...current, [student.id]: event.target.value as Mark }))}
                >
                  {MARKS.map((mark) => (
                    <option key={mark.value} value={mark.value}>{mark.label}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
      <div className="teacher-sticky-save">
        <button className="btn btn-primary" disabled={!classId || roster.length === 0}>
          Save attendance
        </button>
      </div>
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

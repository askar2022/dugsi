"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string; classId: string | null };
type SchoolClass = { id: string; name: string };
type Attendance = { studentId: string; status: string };
type Mark = "present" | "absent" | "late" | "excused";

const MARKS: Array<{ value: Mark; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ])
      .then(([studentData, classData]) => {
        setStudents(studentData.students);
        setClasses(classData.classes);
        setClassId((current) => current || classData.classes[0]?.id || "");
      })
      .finally(() => setReady(true));
  }, []);

  const roster = useMemo(
    () => students.filter((student) => student.classId === classId),
    [classId, students],
  );

  useEffect(() => {
    if (!classId || !date) return;
    api<{ attendance: Attendance[] }>(`/api/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`)
      .then((data) => {
        const next: Record<string, Mark> = {};
        for (const row of data.attendance) {
          next[row.studentId] = row.status as Mark;
        }
        setMarks(next);
      })
      .catch(() => setMarks({}));
  }, [classId, date]);

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
      <PageHeader title="Attendance" description="Choose your assigned class and date, then mark each student." />
      <div className="card parent-form">
        <div className="teacher-filters">
          <FormField label="Class">
            <select className="select" value={classId} onChange={(event) => setClassId(event.target.value)} required>
              <option value="">{ready && classes.length === 0 ? "No assigned class yet" : "Choose a class"}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FormField>
        </div>
      </div>
      {!ready ? (
        <EmptyState title="Loading" text="Loading your assigned class." />
      ) : classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class. You will only see students in your own class."
        />
      ) : !classId ? (
        <EmptyState title="Choose a class" text="Select your assigned class to see the roster." />
      ) : roster.length === 0 ? (
        <EmptyState
          title="No students in this class"
          text="The office still needs to place students in this class."
        />
      ) : (
        <div className="record-list">
          {roster.map((student) => {
            const value = marks[student.id] ?? "present";
            return (
              <article key={student.id} className="card record-card-stack attendance-row">
                <p className="record-title">{student.firstName} {student.lastName}</p>
                <div className="mark-group" role="group" aria-label={`Attendance for ${student.firstName}`}>
                  {MARKS.map((mark) => (
                    <button
                      key={mark.value}
                      type="button"
                      className={`mark-btn is-${mark.value}${value === mark.value ? " is-active" : ""}`}
                      onClick={() => setMarks((current) => ({ ...current, [student.id]: mark.value }))}
                    >
                      {mark.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <button className="btn btn-primary parent-form-submit" disabled={!classId || roster.length === 0}>
        Save attendance
      </button>
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

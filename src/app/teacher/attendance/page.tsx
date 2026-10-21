"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string; classId: string | null };
type SchoolClass = { id: string; name: string };

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]).then(([studentData, classData]) => {
      setStudents(studentData.students);
      setClasses(classData.classes);
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const classId = String(form.get("classId"));
    const date = String(form.get("date"));
    const marks = students
      .filter((student) => !classId || student.classId === classId)
      .map((student) => ({
        studentId: student.id,
        status: String(form.get(`status-${student.id}`) || "present"),
      }));
    await api("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ classId, date, marks }),
    });
    setMessage("Attendance saved.");
  }

  const classId = classes[0]?.id ?? "";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader title="Attendance" description="Mark who is present today." />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Class">
          <select className="select" name="classId" defaultValue={classId}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Date">
          <input className="input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
      </div>
      <div className="card divide-y divide-line">
        {students.map((student) => (
          <div key={student.id} className="flex items-center justify-between p-4">
            <p>{student.firstName} {student.lastName}</p>
            <select className="select w-40" name={`status-${student.id}`} defaultValue="present">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        ))}
      </div>
      <button className="btn btn-primary">Save attendance</button>
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

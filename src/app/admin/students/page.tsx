"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  class?: { name: string } | null;
  parent?: { name: string; email: string } | null;
};

type SchoolClass = { id: string; name: string };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [studentData, classData] = await Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setStudents(studentData.students);
    setClasses(classData.classes);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/students", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    setMessage("Student registered and the parent email was logged.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Student registration</h3>
        <p className="text-muted">Register a child and optionally create a parent login for this dugsi only.</p>
      </div>
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="First name"><input className="input" name="firstName" required /></FormField>
        <FormField label="Last name"><input className="input" name="lastName" required /></FormField>
        <FormField label="Date of birth"><input className="input" name="dateOfBirth" type="date" /></FormField>
        <FormField label="Class">
          <select className="select" name="classId">
            <option value="">Unassigned</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Parent name"><input className="input" name="parentName" /></FormField>
        <FormField label="Parent email"><input className="input" name="parentEmail" type="email" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Register student</button>
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Parent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.firstName} {student.lastName}</td>
                <td>{student.class?.name ?? "—"}</td>
                <td>{student.parent?.name ?? "—"}</td>
                <td><StatusBadge status={student.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

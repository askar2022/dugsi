"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
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

export default function EnrollmentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [message, setMessage] = useState("");
  const [addingSample, setAddingSample] = useState(false);

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

  const applications = students.filter((student) => student.status === "pending");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/students", { method: "POST", body: JSON.stringify({ ...data, status: "enrolled" }) });
    form.reset();
    setMessage("Student registered.");
    await load();
  }

  async function enroll(id: string) {
    await api(`/api/students/${id}`, { method: "PATCH", body: JSON.stringify({ status: "enrolled" }) });
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Enrollment" description="Review new applications and register students." />
      {students.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-muted">No students yet. Register a child, or add the staging sample family.</p>
          <button
            type="button"
            className="btn btn-ghost mt-3"
            disabled={addingSample}
            onClick={async () => {
              setAddingSample(true);
              try {
                await api("/api/demo/sample-families", { method: "POST" });
                setMessage("Sample parent and students added.");
                await load();
              } finally {
                setAddingSample(false);
              }
            }}
          >
            {addingSample ? "Adding..." : "Add sample parent and students"}
          </button>
        </div>
      ) : null}
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
      <div>
        <h4 className="mb-3 text-lg font-semibold text-green">New applications</h4>
        <div className="card table-wrap p-2">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4}>No pending applications. Parent enrollments will appear here.</td>
                </tr>
              ) : (
                applications.map((student) => (
                  <tr key={student.id}>
                    <td>{student.firstName} {student.lastName}</td>
                    <td>{student.parent?.name ?? "—"}</td>
                    <td><StatusBadge status={student.status} /></td>
                    <td>
                      <button className="btn btn-primary px-3 py-2 text-sm" onClick={() => enroll(student.id)}>
                        Enroll
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

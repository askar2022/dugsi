"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type SchoolClass = { id: string; name: string };
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  status?: string;
};
type Completion = {
  studentId: string;
  student: { firstName: string; lastName: string } | { firstName: string; lastName: string }[] | null;
};
type Homework = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  class: { name: string } | { name: string }[] | null;
  completions?: Completion[];
};

function classNameOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

function studentOf(completion: Completion) {
  const value = completion.student;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function assignedTo(item: Homework) {
  const names = (item.completions ?? [])
    .map((row) => {
      const student = studentOf(row);
      return student ? `${student.firstName} ${student.lastName}` : null;
    })
    .filter(Boolean);
  return names.length ? names.join(", ") : "Whole class";
}

export default function HomeworkPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [classId, setClassId] = useState("");

  async function load() {
    const [classData, studentData, homeworkData] = await Promise.all([
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ students: Student[] }>("/api/students"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]);
    setClasses(classData.classes);
    setStudents(studentData.students);
    setHomework(homeworkData.homework);
    setClassId((current) => current || classData.classes[0]?.id || "");
  }

  useEffect(() => {
    load();
  }, []);

  const classStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          student.classId === classId &&
          student.status !== "unenrolled" &&
          student.status !== "declined",
      ),
    [students, classId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/homework", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Homework" description="Assign work to a student or the whole class." />
      {classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class before you send homework."
        />
      ) : (
        <form onSubmit={onSubmit} className="card parent-form teacher-form">
          <FormField label="Class">
            <select
              className="select"
              name="classId"
              required
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Student">
            <select key={classId} className="select" name="studentId" required>
              <option value="">Choose a student</option>
              <option value="all">Whole class</option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title"><input className="input" name="title" required /></FormField>
          <FormField label="Assigned">
            <input className="input" name="assignedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </FormField>
          <FormField label="Due"><input className="input" name="dueDate" type="date" /></FormField>
          <FormField label="Description">
            <textarea className="input parent-notes" name="description" rows={3} />
          </FormField>
          <button className="btn btn-primary parent-form-submit">Assign homework</button>
        </form>
      )}
      {homework.length === 0 ? (
        <EmptyState title="No homework yet" text="Assigned work for your class will appear here." />
      ) : (
        <div className="record-list">
          {homework.map((item) => (
            <article key={item.id} className="card record-card-stack">
              <p className="record-title">{item.title}</p>
              <p className="record-meta">
                {assignedTo(item)}
                {classNameOf(item) ? ` · ${classNameOf(item)}` : ""}
                {item.dueDate ? ` · due ${item.dueDate}` : ""}
              </p>
              {item.description ? <p className="record-body">{item.description}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

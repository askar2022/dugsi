"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { HomeworkForm, type HomeworkClass, type HomeworkPayload, type HomeworkStudent } from "@/components/portal/HomeworkForm";
import { api } from "@/lib/api";

export default function AssignHomeworkPage() {
  const [classes, setClasses] = useState<HomeworkClass[]>([]);
  const [students, setStudents] = useState<HomeworkStudent[]>([]);
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    Promise.all([
      api<{ classes: HomeworkClass[] }>("/api/classes"),
      api<{ students: HomeworkStudent[] }>("/api/students"),
    ]).then(([classData, studentData]) => {
      setClasses(classData.classes);
      setStudents(studentData.students);
    });
  }, []);

  async function onSubmit(payload: HomeworkPayload) {
    await api("/api/homework", { method: "POST", body: JSON.stringify(payload) });
    setSaved(true);
  }

  function assignAnother() {
    setSaved(false);
    setFormKey((current) => current + 1);
  }

  return (
    <div className="page-stack">
      <h1 className="page-title">Assign Homework</h1>
      {classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class before you send homework."
        />
      ) : saved ? (
        <section className="card teacher-panel">
          <p className="record-title">Homework assigned successfully.</p>
          <p className="record-meta">Parents will see this on their homework page.</p>
          <div className="homework-form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn-primary" onClick={assignAnother}>Assign Another</button>
            <Link href="/teacher/homework/view" className="btn btn-ghost">View Homework</Link>
          </div>
        </section>
      ) : (
        <HomeworkForm
          key={formKey}
          classes={classes}
          students={students}
          submitLabel="Assign Homework"
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

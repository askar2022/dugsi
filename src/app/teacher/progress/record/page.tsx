"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { ProgressForm, type ProgressPayload, type ProgressStudent } from "@/components/portal/ProgressForm";
import { api } from "@/lib/api";

export default function RecordProgressPage() {
  const [students, setStudents] = useState<ProgressStudent[]>([]);
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    api<{ students: ProgressStudent[] }>("/api/students").then((data) => setStudents(data.students));
  }, []);

  async function onSubmit(payload: ProgressPayload) {
    await api("/api/progress", { method: "POST", body: JSON.stringify(payload) });
    setSaved(true);
  }

  function recordAnother() {
    setSaved(false);
    setFormKey((current) => current + 1);
  }

  return (
    <div className="page-stack">
      <h1 className="page-title">Record Progress</h1>
      {students.length === 0 ? (
        <EmptyState
          title="No students in your class"
          text="Ask the office to assign you a class and place students in it."
        />
      ) : saved ? (
        <section className="card teacher-panel">
          <p className="record-title">Progress saved successfully.</p>
          <p className="record-meta">The student’s Qur’an record is updated.</p>
          <div className="homework-form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn-primary" onClick={recordAnother}>Record Another Student</button>
            <Link href="/teacher/progress/view" className="btn btn-ghost">View Progress</Link>
          </div>
        </section>
      ) : (
        <ProgressForm
          key={formKey}
          students={students}
          submitLabel="Save Progress"
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

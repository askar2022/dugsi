"use client";

import { useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

export default function ParentStudentsPage() {
  const { children, ready, reload } = useParentFamily();
  const [busy, setBusy] = useState("");

  async function unenroll(id: string, name: string) {
    const ok = window.confirm(`Unenroll ${name} from this dugsi? The school keeps the record.`);
    if (!ok) return;
    setBusy(id);
    try {
      await api(`/api/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "unenroll" }),
      });
      await reload();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Enrolled students"
        description="Your children at this dugsi. You can unenroll a child here."
      />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : (
        <section className="family-list">
          {children.map((student) => (
            <article key={student.id} className="card family-item">
              <div className="family-item-top">
                <div>
                  <p className="family-item-name">{childName(student)}</p>
                  <p className="family-item-class">{classPlaceLabel(student)}</p>
                </div>
                <StatusBadge status={student.status === "unenrolled" ? "unenrolled" : student.status === "waiting_assessment" ? "waiting_assessment" : "enrolled"} />
              </div>
              {student.status === "unenrolled" ? (
                <p className="family-item-meta">This child is unenrolled.</p>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: "0.75rem", justifySelf: "start" }}
                  disabled={busy === student.id}
                  onClick={() => unenroll(student.id, childName(student))}
                >
                  {busy === student.id ? "Unenrolling..." : "Unenroll"}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

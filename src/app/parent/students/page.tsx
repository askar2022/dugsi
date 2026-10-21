"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

type Progress = {
  studentId?: string;
  surah: string;
  juz: number | null;
  student?: { id?: string } | { id?: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function enrolledOn(value?: string | null) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function studentStatus(status: string) {
  if (status === "unenrolled") return "unenrolled";
  if (status === "waiting_assessment" || status === "pending") return "waiting_assessment";
  return "enrolled";
}

export default function ParentStudentsPage() {
  const { children, ready, reload } = useParentFamily();
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    api<{ progress: Progress[] }>("/api/progress")
      .then((data) => setProgress(data.progress))
      .catch(() => setProgress([]));
  }, []);

  const latestByChild = useMemo(() => {
    const map = new Map<string, Progress>();
    for (const item of progress) {
      const id = item.studentId ?? one(item.student)?.id;
      if (!id || map.has(id)) continue;
      map.set(id, item);
    }
    return map;
  }, [progress]);

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
        description="See each child's class, enrolled date, and current Juz and Surah. You can unenroll a child here."
      />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : (
        <div className="card table-wrap p-2">
          <table className="family-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Class</th>
                <th>Enrolled</th>
                <th>Juz</th>
                <th>Surah</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {children.map((student) => {
                const latest = latestByChild.get(student.id);
                return (
                  <tr key={student.id} className={`is-${studentStatus(student.status)}`}>
                    <td>{childName(student)}</td>
                    <td>{classPlaceLabel(student)}</td>
                    <td>{enrolledOn(student.createdAt)}</td>
                    <td>{latest?.juz ?? "—"}</td>
                    <td>{latest?.surah ?? "—"}</td>
                    <td><StatusBadge status={studentStatus(student.status)} /></td>
                    <td>
                      {student.status === "unenrolled" ? (
                        "Unenrolled"
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy === student.id}
                          onClick={() => unenroll(student.id, childName(student))}
                        >
                          {busy === student.id ? "Unenrolling..." : "Unenroll"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

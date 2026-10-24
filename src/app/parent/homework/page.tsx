"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { HOMEWORK_KIND_LABELS, normalizeHomeworkKind } from "@/lib/homework";
import { childName } from "@/lib/parent-family";

type Completion = { studentId: string; status: string };
type Homework = {
  id: string;
  title: string;
  kind?: string | null;
  surah?: string | null;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz?: number | null;
  description: string | null;
  dueDate: string | null;
  studentId?: string | null;
  classId?: string;
  class: { id: string; name: string } | { id: string; name: string }[] | null;
  completions?: Completion[];
};

function longDue(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function assignmentTitle(item: Homework) {
  const kind = HOMEWORK_KIND_LABELS[normalizeHomeworkKind(item.kind)];
  if (item.surah) return `${kind}: Surah ${item.surah}`;
  return item.title || kind;
}

function quranLine(item: Homework) {
  const juz = item.juz ? `Juz ${item.juz}` : "";
  const ayah = item.ayahFrom && item.ayahTo ? `Ayah ${item.ayahFrom}–${item.ayahTo}` : "";
  return [juz, ayah].filter(Boolean).join(" · ");
}

function statusView(status: string) {
  if (status === "done") return { label: "✅ Completed", className: "is-done" };
  if (status === "needs_help") return { label: "🟠 Help Requested", className: "is-help" };
  return { label: "⏳ Not Completed", className: "is-wait" };
}

export default function ParentHomeworkPage() {
  const { children, child, childId, selectChild, ready } = useParentFamily();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await api<{ homework: Homework[] }>("/api/homework");
    setHomework(data.homework);
  }

  useEffect(() => {
    load().catch(() => setHomework([]));
  }, []);

  const classId = isAssessmentClass(child?.class) ? null : child?.classId ?? child?.class?.id ?? null;
  const waiting = child?.status === "waiting_assessment" || child?.status === "pending" || !classId;
  const rows = child && classId && !waiting
    ? homework.filter((item) =>
        item.studentId
          ? item.studentId === child.id
          : Boolean(item.completions?.some((row) => row.studentId === child.id)),
      )
    : [];

  async function mark(homeworkId: string, status: "done" | "needs_help") {
    if (!childId) return;
    setBusy(`${homeworkId}:${status}`);
    try {
      await api(`/api/homework/${homeworkId}`, {
        method: "PATCH",
        body: JSON.stringify({ studentId: childId, status }),
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Homework</h1>
        {child ? (
          <p className="page-copy">{childName(child)} — {child.class?.name ?? "Class"}</p>
        ) : (
          <p className="page-copy">Qur’an work for your child.</p>
        )}
      </div>
      <ChildSwitcher children={children} childId={childId} onSelect={selectChild} />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : waiting ? (
        <EmptyState
          title="Waiting for assessment"
          text={`Homework will appear after ${child ? child.firstName : "your child"} is placed in a class.`}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No homework yet"
          text="Homework will appear when the teacher assigns Qur’an work to your child."
        />
      ) : (
        <div className="record-list">
          {rows.map((item) => {
            const completion = item.completions?.find((row) => row.studentId === childId);
            const status = completion?.status ?? "assigned";
            const marked = status === "done" || status === "needs_help";
            const view = statusView(status);
            return (
              <article key={item.id} className="card parent-hw-card">
                <p className="record-title">{assignmentTitle(item)}</p>
                {quranLine(item) ? <p className="homework-portion">{quranLine(item)}</p> : null}
                {item.dueDate ? <p className="record-meta">Due {longDue(item.dueDate)}</p> : null}
                {item.description ? <p className="record-body">{item.description}</p> : null}
                {marked ? (
                  <p className={`parent-hw-status ${view.className}`}>{view.label}</p>
                ) : (
                  <div className="parent-hw-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={Boolean(busy)}
                      onClick={() => mark(item.id, "done")}
                    >
                      {busy === `${item.id}:done` ? "Saving..." : "Mark Done"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={Boolean(busy)}
                      onClick={() => mark(item.id, "needs_help")}
                    >
                      {busy === `${item.id}:needs_help` ? "Saving..." : "Need Help"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

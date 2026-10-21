"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { quranPortion } from "@/lib/quran";

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
  class: { id: string; name: string } | { id: string; name: string }[] | null;
  completions?: Completion[];
};

function classOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function assignedToChild(item: Homework, childId: string) {
  return !item.studentId || item.studentId === childId;
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
  const rows = classId && childId && !waiting
    ? homework.filter((item) => classOf(item)?.id === classId && assignedToChild(item, childId))
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
      <PageHeader
        title="Homework"
        description={
          child
            ? `Quran work for ${child.firstName}. Choose a child from the dropdown, then mark Done or Needs help.`
            : "Choose a child from the dropdown, then mark Done or Needs help."
        }
      />
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
          text="Homework will appear when the teacher assigns Quran work to your child."
        />
      ) : (
        <div className="record-list">
          {rows.map((item) => {
            const klass = classOf(item);
            const portion = quranPortion(item);
            const completion = item.completions?.find((row) => row.studentId === childId);
            const status = completion?.status ?? "assigned";
            return (
              <article key={item.id} className="card record-card-stack homework-card">
                <div className="homework-card-top">
                  <StatusBadge status={item.kind || "reading"} />
                  <StatusBadge status={status} />
                </div>
                <p className="record-title">{item.title}</p>
                {portion ? <p className="homework-portion">{portion}</p> : null}
                <p className="record-meta">
                  {klass?.name ?? "Class"}
                  {item.dueDate ? ` · due ${item.dueDate}` : ""}
                </p>
                {item.description ? <p className="record-body">{item.description}</p> : null}
                <div className="mark-group homework-actions">
                  <button
                    type="button"
                    className={`mark-btn is-on_track${status === "done" ? " is-active" : ""}`}
                    disabled={Boolean(busy)}
                    onClick={() => mark(item.id, "done")}
                  >
                    {busy === `${item.id}:done` ? "Saving..." : "Done"}
                  </button>
                  <button
                    type="button"
                    className={`mark-btn is-contact_parent${status === "needs_help" ? " is-active" : ""}`}
                    disabled={Boolean(busy)}
                    onClick={() => mark(item.id, "needs_help")}
                  >
                    {busy === `${item.id}:needs_help` ? "Saving..." : "Needs help"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

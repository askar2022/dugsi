"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";
import { normalizeProgressStatus } from "@/lib/progress-status";

type Progress = {
  id: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number | null;
  date: string;
  status?: string | null;
  student?: {
    firstName: string;
    lastName: string;
    class?: { name: string; level: string | null } | { name: string; level: string | null }[] | null;
  } | null;
};

function classOf(item: Progress) {
  const value = item.student?.class;
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function ParentProgressPage() {
  const { children, child, childId, selectChild, ready } = useParentFamily();
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    if (!childId) {
      setProgress([]);
      return;
    }
    api<{ progress: Progress[] }>(`/api/progress?studentId=${encodeURIComponent(childId)}`)
      .then((data) => setProgress(data.progress))
      .catch(() => setProgress([]));
  }, [childId]);

  const latest = progress[0];
  const level = child?.class?.level ?? classOf(latest ?? {})?.level ?? null;

  return (
    <div className="page-stack">
      <PageHeader
        title="Child Progress"
        description={child ? `Green is on track, yellow needs practice, red means contact the school.` : "Green is on track, yellow needs practice, red means contact the school."}
      />
      <ChildSwitcher children={children} childId={childId} onSelect={selectChild} />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : progress.length === 0 ? (
        <EmptyState
          title="No Quran progress yet"
          text={`Quran progress will appear after the teacher records ${child ? child.firstName + "'s" : "your child's"} Surah and Ayah.`}
        />
      ) : (
        <>
          <section className={`card progress-latest is-${normalizeProgressStatus(latest.status)}`}>
            <p className="progress-latest-kicker">{child ? childName(child) : "Latest"}</p>
            <h2 className="progress-latest-title">Current Quran place</h2>
            <div style={{ margin: "-0.35rem 0 0.9rem" }}>
              <StatusBadge status={normalizeProgressStatus(latest.status)} />
            </div>
            <div className="progress-stats">
              <div className="stat">
                <p className="stat-label">Surah</p>
                <p className="stat-value">{latest.surah}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Ayah</p>
                <p className="stat-value">{latest.ayahFrom}–{latest.ayahTo}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Juz</p>
                <p className="stat-value">{latest.juz ?? "—"}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Level</p>
                <p className="stat-value">{level ?? "—"}</p>
              </div>
            </div>
          </section>
          <div className="record-list">
            {progress.map((item) => (
              <article key={item.id} className={`card record-card record-card-stack progress-row is-${normalizeProgressStatus(item.status)}`}>
                <p className="record-title">{item.surah}</p>
                <p className="record-meta">
                  Ayah {item.ayahFrom}–{item.ayahTo}
                  {item.juz ? ` · Juz ${item.juz}` : ""}
                  {level ? ` · ${level}` : ""}
                  {` · ${item.date}`}
                </p>
                <StatusBadge status={normalizeProgressStatus(item.status)} />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";
import { describeProgress, historyKind, type ProgressPlace } from "@/lib/progress-compare";
import { normalizeProgressStatus } from "@/lib/progress-status";

type Progress = ProgressPlace & {
  student?: {
    firstName: string;
    lastName: string;
  } | null;
};

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

  const story = useMemo(() => describeProgress(progress), [progress]);
  const latest = story.latest;
  const className = child ? classPlaceLabel(child) : "";

  return (
    <div className="page-stack">
      <PageHeader
        title="Child Progress"
        description="Choose a child from the dropdown. This page uses the same Juz, Surah, and ayah the teacher recorded. Green is on track, yellow needs practice, red means contact the school."
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
          title={child ? `No Quran progress for ${child.firstName} yet` : "No Quran progress yet"}
          text={
            child?.status === "waiting_assessment" || child?.status === "pending"
              ? `${child.firstName} is waiting for assessment. Progress will appear after they are placed in a class and the teacher records it.`
              : `Quran progress will appear after the teacher records ${child ? child.firstName + "'s" : "your child's"} Juz, Surah, and ayah.`
          }
        />
      ) : latest ? (
        <>
          <section className={`card progress-latest is-${normalizeProgressStatus(latest.status)}`}>
            <p className="progress-latest-kicker">
              {child ? childName(child) : "Current place"}
              {className ? ` · ${className}` : ""}
            </p>
            <h2 className="progress-latest-title">Current Quran place</h2>
            <div className="progress-latest-status">
              <StatusBadge status={normalizeProgressStatus(latest.status)} />
              <p className="progress-recorded">Teacher recorded {latest.date}</p>
            </div>
            <div className="progress-stats">
              <div className="stat">
                <p className="stat-label">Juz</p>
                <p className="stat-value">{latest.juz ?? "—"}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Surah</p>
                <p className="stat-value">{latest.surah}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Ayah</p>
                <p className="stat-value">{latest.ayahFrom}–{latest.ayahTo}</p>
              </div>
            </div>
          </section>

          {story.change ? (
            <section className={`card progress-change is-${story.change.kind}`}>
              <p className="progress-change-label">Since the last update</p>
              <p className="progress-change-text">{story.change.text}</p>
              <p className="progress-change-note">
                New ayahs count only when the teacher marks the work on track. Review and practice are not new progress.
              </p>
            </section>
          ) : null}

          {story.weekly || story.quarterly ? (
            <section className="card progress-periods">
              {story.weekly ? <p>{story.weekly.text}</p> : null}
              {story.quarterly ? <p>{story.quarterly.text}</p> : null}
            </section>
          ) : null}

          <div className="card table-wrap p-2">
            <table className="family-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Juz</th>
                  <th>Surah</th>
                  <th>Ayah</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {story.history.map((item, index) => {
                  const older = story.history[index + 1] ?? null;
                  return (
                    <tr key={item.id ?? `${item.date}-${item.surah}`} className={`is-${normalizeProgressStatus(item.status)}`}>
                      <td>{item.date}</td>
                      <td>{item.juz ?? "—"}</td>
                      <td>{item.surah}</td>
                      <td>{item.ayahFrom}–{item.ayahTo}</td>
                      <td><StatusBadge status={normalizeProgressStatus(item.status)} /></td>
                      <td>{historyKind(item, older)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

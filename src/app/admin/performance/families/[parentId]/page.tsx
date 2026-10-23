"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FamilyPerformanceCard, type FamilyCard } from "@/components/portal/PerformanceCards";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { RatingKey } from "@/lib/performance";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  onTimeArrival: number | null;
  homeworkAssigned: number;
  homeworkReviewed: number;
  homeworkScore: number | null;
  rating: RatingKey | "none";
};

type Report = { families: FamilyCard[]; students?: StudentRow[] };

export default function FamilyPerformanceDetailPage() {
  const params = useParams<{ parentId: string }>();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!params.parentId) return;
    api<Report>(`/api/performance?parentId=${encodeURIComponent(params.parentId)}`).then(setReport).catch(() => setReport(null));
  }, [params.parentId]);

  const family = report?.families[0];

  return (
    <div className="page-stack">
      <PageHeader
        title={family?.name ?? "Family engagement"}
        description="Only actions this family recorded in the app count."
      />
      <Link href="/admin/performance" className="btn btn-ghost">Back to Performance</Link>
      {family ? <FamilyPerformanceCard item={family} /> : null}
      <section className="perf-grid">
        {(report?.students ?? []).map((student) => (
          <article key={student.id} className="card perf-card">
            <div className="perf-card-top">
              <h2 className="perf-title">{student.firstName} {student.lastName}</h2>
              <StatusBadge status={student.rating === "none" ? "needs_attention" : student.rating} />
            </div>
            <div className="perf-stats">
              <div className="perf-stat is-paid">
                <p className="perf-stat-value">{student.onTimeArrival == null ? "—" : `${student.onTimeArrival}%`}</p>
                <p className="perf-stat-label">On-time arrival</p>
              </div>
              <div className="perf-stat is-due">
                <p className="perf-stat-value">{student.homeworkAssigned ? `${student.homeworkReviewed} of ${student.homeworkAssigned}` : "—"}</p>
                <p className="perf-stat-label">Homework follow-up</p>
              </div>
              <div className="perf-stat">
                <p className="perf-stat-value">—</p>
                <p className="perf-stat-label">On-time pickup</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

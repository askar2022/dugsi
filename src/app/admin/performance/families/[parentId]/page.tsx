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
        description="Only actions this family recorded in the app count: on-time arrival and homework follow-up. Pickup stays hidden until the app records it."
      />
      <Link href="/admin/performance" className="btn btn-ghost">Back to Performance</Link>
      {family ? <FamilyPerformanceCard item={family} /> : null}
      <section className="record-list">
        {(report?.students ?? []).map((student) => (
          <article key={student.id} className={`card record-card-stack progress-row is-${student.rating === "support_needed" ? "contact_parent" : student.rating === "on_track" ? "on_track" : "needs_practice"}`}>
            <div className="homework-card-top">
              <p className="record-title">{student.firstName} {student.lastName}</p>
              <StatusBadge status={student.rating === "none" ? "needs_attention" : student.rating} />
            </div>
            <p className="record-meta">On-time arrival: {student.onTimeArrival == null ? "—" : `${student.onTimeArrival}%`}</p>
            <p className="record-meta">
              Homework follow-up: {student.homeworkReviewed}/{student.homeworkAssigned}
              {student.homeworkScore != null ? ` · ${student.homeworkScore}%` : ""}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

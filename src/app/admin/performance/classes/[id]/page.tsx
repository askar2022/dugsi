"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ClassPerformanceCard, type ClassCard } from "@/components/portal/PerformanceCards";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { RatingKey } from "@/lib/performance";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  quranScore: number | null;
  attendanceScore: number | null;
  homeworkScore: number | null;
  homeworkAssigned: number;
  homeworkReviewed: number;
  score: number | null;
  rating: RatingKey | "none";
};

type Report = { classes: ClassCard[]; students?: StudentRow[] };

export default function ClassPerformanceDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api<Report>(`/api/performance?classId=${encodeURIComponent(params.id)}`).then(setReport).catch(() => setReport(null));
  }, [params.id]);

  const klass = report?.classes[0];

  return (
    <div className="page-stack">
      <PageHeader
        title={klass ? `${klass.teacherName} — ${klass.name}` : "Class performance"}
        description="This class is scored from each child’s own Qur’an path, plus homework follow-up and attendance in the last four weeks."
      />
      <Link href="/admin/performance" className="btn btn-ghost">Back to Performance</Link>
      {klass ? <ClassPerformanceCard item={klass} /> : null}
      <section className="record-list">
        {(report?.students ?? []).map((student) => (
          <article key={student.id} className={`card record-card-stack progress-row is-${student.rating === "support_needed" ? "contact_parent" : student.rating === "on_track" ? "on_track" : "needs_practice"}`}>
            <div className="homework-card-top">
              <p className="record-title">{student.firstName} {student.lastName}</p>
              <StatusBadge status={student.rating === "none" ? "needs_attention" : student.rating} />
            </div>
            <p className="record-meta">Own Qur’an goal: {student.quranScore == null ? "—" : `${student.quranScore}%`}</p>
            <p className="record-meta">Attendance: {student.attendanceScore == null ? "—" : `${student.attendanceScore}%`}</p>
            <p className="record-meta">
              Homework: {student.homeworkReviewed}/{student.homeworkAssigned} reviewed
              {student.homeworkScore != null ? ` · ${student.homeworkScore}%` : ""}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

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
  homeworkAssigned: number;
  homeworkReviewed: number;
  rating: RatingKey | "none";
};

type Report = { classes: ClassCard[]; students?: StudentRow[] };

export default function TeacherClassPerformancePage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!params.id) return;
    api<Report>(`/api/performance?classId=${encodeURIComponent(params.id)}`).then(setReport).catch(() => setReport(null));
  }, [params.id]);

  const klass = report?.classes[0];

  return (
    <div className="page-stack">
      <PageHeader title={klass?.name ?? "Your class"} description="Only students in your class." />
      <Link href="/teacher/performance" className="btn btn-ghost">Back</Link>
      {klass ? <ClassPerformanceCard item={klass} /> : null}
      <section className="perf-grid">
        {(report?.students ?? []).map((student) => (
          <article key={student.id} className="card perf-card">
            <div className="perf-card-top">
              <h2 className="perf-title">{student.firstName} {student.lastName}</h2>
              <StatusBadge status={student.rating === "none" ? "needs_attention" : student.rating} />
            </div>
            <div className="perf-stats">
              <div className="perf-stat is-paid">
                <p className="perf-stat-value">{student.quranScore == null ? "—" : `${student.quranScore}%`}</p>
                <p className="perf-stat-label">Own Qur’an goal</p>
              </div>
              <div className="perf-stat is-due">
                <p className="perf-stat-value">{student.attendanceScore == null ? "—" : `${student.attendanceScore}%`}</p>
                <p className="perf-stat-label">Attendance</p>
              </div>
              <div className="perf-stat">
                <p className="perf-stat-value">{student.homeworkAssigned ? `${student.homeworkReviewed} of ${student.homeworkAssigned}` : "—"}</p>
                <p className="perf-stat-label">Homework</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

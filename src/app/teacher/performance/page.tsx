"use client";

import { useEffect, useState } from "react";
import { ClassPerformanceCard, type ClassCard } from "@/components/portal/PerformanceCards";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Report = { classes: ClassCard[]; window: { start: string; end: string } };

export default function TeacherPerformancePage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<Report>("/api/performance").then(setReport).catch(() => setReport(null));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        title="Your class"
        description="This is only your class, scored against each child’s own Qur’an goal over four weeks. You will not see other teachers."
      />
      <section className="record-list">
        {(report?.classes ?? []).map((item) => (
          <ClassPerformanceCard key={item.id} item={item} />
        ))}
        {report && report.classes.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No class records yet</p>
            <p className="empty-state-text">Save attendance, homework, and Qur’an progress. Your card uses the last four weeks.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

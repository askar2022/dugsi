"use client";

import { useEffect, useState } from "react";
import {
  ClassPerformanceCard,
  FamilyPerformanceCard,
  SchoolPerformanceCard,
  type ClassCard,
  type FamilyCard,
  type SchoolCard,
} from "@/components/portal/PerformanceCards";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Tab = "classes" | "families";

type Report = {
  window: { start: string; end: string; days: number };
  school: SchoolCard | null;
  classes: ClassCard[];
  families: FamilyCard[];
};

export default function AdminPerformancePage() {
  const [tab, setTab] = useState<Tab>("classes");
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<Report>("/api/performance").then(setReport).catch(() => setReport(null));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        title="Performance"
        description="Each child is scored against their own Qur’an goal. Class counts add up to the whole dugsi."
      />

      {!report || !report.school ? (
        <div className="card empty-state">
          <p className="empty-state-title">Loading performance</p>
          <p className="empty-state-text">Gathering the last four weeks of attendance, homework, and Qur’an records.</p>
        </div>
      ) : (
        <SchoolPerformanceCard
          item={report.school}
          windowLabel={`${report.window.start} to ${report.window.end}`}
        />
      )}

      <div className="performance-tabs">
        <button type="button" className={`btn ${tab === "classes" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("classes")}>
          Classes & Teachers
        </button>
        <button type="button" className={`btn ${tab === "families" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("families")}>
          Family Engagement
        </button>
      </div>

      {tab === "classes" ? (
        <section className="perf-grid">
          {(report?.classes ?? []).map((item) => (
            <ClassPerformanceCard key={item.id} item={item} studentsHref={`/admin/performance/classes/${item.id}`} />
          ))}
          {report && report.classes.length === 0 ? (
            <div className="card empty-state">
              <p className="empty-state-title">No class records yet</p>
              <p className="empty-state-text">Teachers save attendance, homework, and Qur’an progress. Cards appear after those records.</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="perf-grid">
          {(report?.families ?? []).map((item) => (
            <FamilyPerformanceCard key={item.id} item={item} href={`/admin/performance/families/${item.id}`} />
          ))}
          {report && report.families.length === 0 ? (
            <div className="card empty-state">
              <p className="empty-state-title">No family records yet</p>
              <p className="empty-state-text">Family cards use only actions the app recorded: on-time arrival and homework follow-up.</p>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

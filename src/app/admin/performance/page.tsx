"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClassPerformanceCard, FamilyPerformanceCard, type ClassCard, type FamilyCard } from "@/components/portal/PerformanceCards";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { CLASS_RATING_LABELS, type RatingKey } from "@/lib/performance";

type Tab = "classes" | "families";

type Report = {
  window: { start: string; end: string; days: number };
  school: {
    students: number;
    onTrackPct: number | null;
    needsSupportPct: number | null;
    supportCount: number;
    score: number | null;
    rating: RatingKey | "none";
  } | null;
  classes: ClassCard[];
  families: FamilyCard[];
};

export default function AdminPerformancePage() {
  const [tab, setTab] = useState<Tab>("classes");
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<Report>("/api/performance").then(setReport).catch(() => setReport(null));
  }, []);

  const school = report?.school;
  const schoolRating = school?.rating && school.rating !== "none" ? school.rating : "needs_attention";

  return (
    <div className="page-stack">
      <PageHeader
        title="Performance"
        description="Each child is measured against their own Qur’an goal over the last four weeks — not against other students. Ratings stay in the office. Teachers never see another teacher’s card, and families never see another family."
      />

      {!report || !school ? (
        <div className="card empty-state">
          <p className="empty-state-title">Loading performance</p>
          <p className="empty-state-text">Gathering the last four weeks of attendance, homework, and Qur’an records.</p>
        </div>
      ) : (
        <section className={`card record-card-stack progress-row is-${school.rating === "support_needed" ? "contact_parent" : school.rating === "on_track" ? "on_track" : "needs_practice"}`}>
          <div className="homework-card-top">
            <p className="record-title">Whole dugsi</p>
            <StatusBadge status={schoolRating} />
          </div>
          <p className="record-meta">
            {school.students} student{school.students === 1 ? "" : "s"}
            {school.onTrackPct != null ? ` | ${school.onTrackPct}% On Track` : ""}
            {school.rating !== "none" ? ` | ${CLASS_RATING_LABELS[school.rating]}` : ""}
          </p>
          <p className="record-meta">
            {school.supportCount} student{school.supportCount === 1 ? "" : "s"} need additional support · {report.window.start} to {report.window.end}
          </p>
        </section>
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
        <section className="record-list">
          {(report?.classes ?? []).map((item) => (
            <ClassPerformanceCard key={item.id} item={item} href={`/admin/performance/classes/${item.id}`} />
          ))}
          {report && report.classes.length === 0 ? (
            <div className="card empty-state">
              <p className="empty-state-title">No class records yet</p>
              <p className="empty-state-text">Teachers save attendance, homework, and Qur’an progress. Cards appear after those records.</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="record-list">
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

      <p className="page-copy">
        Open a card for student details. Pickup and announcements stay off these cards until the app records them.{" "}
        <Link href="/admin/progress">Quran Progress</Link> still lists each child’s Surah and Ayah.
      </p>
    </div>
  );
}

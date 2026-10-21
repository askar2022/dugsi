"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Receipt, Users, Wallet } from "lucide-react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";

type Report = {
  students: number;
  enrolled: number;
  pending: number;
  waiting?: number;
  classes: number;
  progress: { on_track: number; needs_practice: number; contact_parent: number; none: number };
  tuition: { paid: number; due: number; late: number };
  expenses: { salary: number; rent: number; equipment: number; other: number };
  expenseTotal: number;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [user, setUser] = useState<Session | null>(null);
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
    api<{ user: Session }>("/api/auth/me").then((data) => setUser(data.user));
    api<{ tenant: { schoolImageUrl: string | null } }>("/api/settings")
      .then((data) => setSchoolImageUrl(data.tenant.schoolImageUrl))
      .catch(() => setSchoolImageUrl(null));
  }, []);

  const enrollment = report
    ? [
        { label: "Enrolled", value: String(report.enrolled), detail: `${report.enrolled} student${report.enrolled === 1 ? "" : "s"} enrolled now`, icon: Users, tone: "paid" },
        { label: "Waiting for assessment", value: String(report.waiting ?? report.pending), detail: "Accepted, not placed in a class yet", icon: Users, tone: "due" },
      ]
    : [];

  const progress = report
    ? [
        { label: "On track", value: String(report.progress.on_track), detail: "Green — teachers say these children are doing well", icon: BookOpen, tone: "paid" },
        { label: "Needs practice", value: String(report.progress.needs_practice), detail: "Yellow — watch these classes", icon: BookOpen, tone: "due" },
        { label: "Needs support", value: String(report.progress.contact_parent), detail: "Red — the class needs more help", icon: BookOpen, tone: "late" },
        { label: "No Quran record", value: String(report.progress.none), detail: "Teacher has not saved progress yet", icon: BookOpen, tone: "due" },
      ]
    : [];

  const moneyCards = report
    ? [
        { label: "Paid tuition", value: money(report.tuition.paid), detail: "Green means families are current", icon: Receipt, tone: "paid" },
        { label: "Due tuition", value: money(report.tuition.due), detail: "Yellow — pay at the dugsi", icon: Receipt, tone: "due" },
        { label: "Late tuition", value: money(report.tuition.late), detail: "Red — follow up with the family", icon: Receipt, tone: "late" },
        { label: "Expenses", value: money(report.expenseTotal), detail: `Salary ${money(report.expenses.salary)} · Rent ${money(report.expenses.rent)}`, icon: Wallet, tone: "green" },
      ]
    : [];

  return (
    <div className="page-stack">
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Reports</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Cards only: how many children
            are enrolled, and how Quran progress looks. Student names stay on Students.
          </p>
        </div>
        <div className="hero-art">
          <SchoolImage
            src={schoolImageUrl}
            name={user?.tenantName}
            alt={user?.tenantName ?? "School"}
            message={user?.tenantName ?? "Your school"}
          />
        </div>
      </section>

      {!report ? (
        <div className="card empty-state">
          <p className="empty-state-title">Loading reports</p>
          <p className="empty-state-text">Gathering this school’s numbers.</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Enrollment</h2>
            <div className="metric-grid" style={{ marginTop: "0.85rem" }}>
              {enrollment.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className={`card metric-card is-${item.tone}`}>
                    <span className="metric-icon"><Icon size={20} /></span>
                    <p className="metric-label">{item.label}</p>
                    <p className="metric-value">{item.value}</p>
                    <p className="metric-detail">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <div className="homework-card-top" style={{ marginBottom: "0.85rem" }}>
              <h2 className="page-title" style={{ fontSize: "1.45rem", margin: 0 }}>Quran progress</h2>
              <Link href="/admin/progress" className="btn btn-ghost">Open details</Link>
            </div>
            <div className="metric-grid">
              {progress.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className={`card metric-card is-${item.tone}`}>
                    <span className="metric-icon"><Icon size={20} /></span>
                    <p className="metric-label">{item.label}</p>
                    <p className="metric-value">{item.value}</p>
                    <p className="metric-detail">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Tuition</h2>
            <div className="metric-grid" style={{ marginTop: "0.85rem" }}>
              {moneyCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className={`card metric-card is-${item.tone}`}>
                    <span className="metric-icon"><Icon size={20} /></span>
                    <p className="metric-label">{item.label}</p>
                    <p className="metric-value">{item.value}</p>
                    <p className="metric-detail">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

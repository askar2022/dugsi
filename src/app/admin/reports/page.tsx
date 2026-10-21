"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Mail, Receipt, Users, Wallet } from "lucide-react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";

type Report = {
  students: number;
  enrolled: number;
  pending: number;
  classes: number;
  staff: number;
  tuition: { paid: number; due: number; late: number };
  expenses: { salary: number; rent: number; equipment: number; other: number };
  expenseTotal: number;
  emails: Array<{ id: string; toEmail: string; subject: string; event: string; createdAt: string }>;
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

  const metrics = report
    ? [
        { label: "Students", value: String(report.students), detail: `${report.enrolled} enrolled · ${report.pending} pending`, icon: Users, tone: "green" },
        { label: "Classes", value: String(report.classes), detail: `${report.staff} staff on record`, icon: BookOpen, tone: "green" },
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
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. These cards show students, tuition,
            and Quran progress so you can see which classes need support.
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
          <section className="metric-grid">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className={`card metric-card is-${item.tone}`}>
                  <span className="metric-icon">
                    <Icon size={20} />
                  </span>
                  <p className="metric-label">{item.label}</p>
                  <p className="metric-value">{item.value}</p>
                  <p className="metric-detail">{item.detail}</p>
                </article>
              );
            })}
          </section>

          <section className="card" style={{ padding: "1.2rem 1.15rem 1.3rem" }}>
            <div className="child-card" style={{ padding: "0 0 0.85rem" }}>
              <span className="menu-icon">
                <BookOpen size={18} />
              </span>
              <div>
                <h2 className="page-title" style={{ fontSize: "1.4rem" }}>Quran progress</h2>
                <p className="page-copy">Monitor what teachers recorded. Green is on track, yellow needs practice, red needs support.</p>
              </div>
            </div>
            <Link href="/admin/progress" className="btn btn-primary">Open Quran progress</Link>
          </section>

          <section className="card" style={{ padding: "1.2rem 1.15rem 1.3rem" }}>
            <div className="child-card" style={{ padding: "0 0 0.85rem" }}>
              <span className="menu-icon">
                <Mail size={18} />
              </span>
              <div>
                <h2 className="page-title" style={{ fontSize: "1.4rem" }}>Recent emails</h2>
                <p className="page-copy">Enrollment, teacher welcome, and tuition notes sent from this school.</p>
              </div>
            </div>
            {report.emails.length === 0 ? (
              <p className="page-copy">No emails yet. They will appear after you enroll a child or add a teacher.</p>
            ) : (
              <div className="record-list">
                {report.emails.map((email) => (
                  <article key={email.id} className="record-card">
                    <div>
                      <p className="record-title">{email.subject}</p>
                      <p className="record-meta">{email.toEmail}</p>
                    </div>
                    <span className="tone-chip">{email.event.replaceAll("_", " ")}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

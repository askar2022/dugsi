"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ClipboardList, Receipt, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";

type Report = {
  students: number;
  enrolled: number;
  pending: number;
  classes: number;
  staff: number;
  tuition: { paid: number; due: number; late: number };
};

const GROUPS = [
  {
    href: "/admin/enrollment",
    label: "Enrollment",
    text: "New students, roster, and parents",
    icon: Users,
  },
  {
    href: "/admin/teachers",
    label: "Teachers & Classes",
    text: "Teachers, class times, and staff",
    icon: BookOpen,
  },
  {
    href: "/admin/billing",
    label: "Tuition & Expenses",
    text: "Paid, due, late, and school costs",
    icon: Receipt,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    text: "A simple view of the school",
    icon: ClipboardList,
  },
];

export default function AdminHomePage() {
  const [report, setReport] = useState<Report | null>(null);
  const [user, setUser] = useState<Session | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
    api<{ user: Session }>("/api/auth/me").then((data) => setUser(data.user));
  }, []);

  const cards = report
    ? [
        ["Students", report.students],
        ["Enrolled", report.enrolled],
        ["Pending", report.pending],
        ["Classes", report.classes],
        ["Paid tuition", `$${report.tuition.paid.toFixed(0)}`],
        ["Late tuition", `$${report.tuition.late.toFixed(0)}`],
      ]
    : [];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Dugsi Management</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. A calm place to look after
            enrollment, classes, tuition records, and reports for this school.
          </p>
        </div>
        <div className="hero-art">
          <img src="/welcome-dugsi.jpg" alt="" />
        </div>
      </section>

      <section className="tile-grid">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Link key={group.href} href={group.href} className="card tile">
              <span className="tile-icon">
                <Icon size={22} />
              </span>
              <p className="tile-label">{group.label}</p>
              <p className="tile-meta">{group.text}</p>
            </Link>
          );
        })}
      </section>

      {cards.length ? (
        <section className="card" style={{ padding: "1.25rem" }}>
          <p className="page-copy" style={{ marginBottom: "0.9rem" }}>
            Today at a glance
          </p>
          <div className="stats-grid">
            {cards.map(([label, value]) => (
              <div key={String(label)} className="stat">
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

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

const TASKS = [
  {
    href: "/admin/enrollment",
    label: "Enrollment",
    text: "Register a child or review a new application.",
    icon: Users,
  },
  {
    href: "/admin/teachers",
    label: "Teachers & Classes",
    text: "See teachers, class times, and staff.",
    icon: BookOpen,
  },
  {
    href: "/admin/billing",
    label: "Tuition & Expenses",
    text: "Mark paid, due, or late. Record school costs.",
    icon: Receipt,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    text: "A simple view of students, tuition, and expenses.",
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
    <div className="page-stack">
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Dugsi Management</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Welcome in. Choose a
            common task below, or use the menu to open students, parents, tuition, and reports.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img src="/welcome-dugsi.jpg" alt="" />
        </div>
      </section>

      <section>
        <h2 className="page-title" style={{ fontSize: "1.7rem" }}>
          Common tasks
        </h2>
        <div className="tile-grid" style={{ marginTop: "1rem" }}>
          {TASKS.map((task) => {
            const Icon = task.icon;
            return (
              <Link key={task.href} href={task.href} className="card tile">
                <span className="tile-icon">
                  <Icon size={22} />
                </span>
                <p className="tile-label">{task.label}</p>
                <p className="tile-meta">{task.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {cards.length ? (
        <section className="card" style={{ padding: "1.35rem" }}>
          <h2 className="page-title" style={{ fontSize: "1.4rem" }}>
            Today at a glance
          </h2>
          <div className="stats-grid" style={{ marginTop: "1rem" }}>
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

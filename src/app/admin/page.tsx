"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardList, Contact, Receipt, UserPlus, Users } from "lucide-react";
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
};

const TASKS = [
  { href: "/admin/enrollment", label: "Enroll a student", text: "Register a child or review a new application.", icon: UserPlus },
  { href: "/admin/students", label: "Open the roster", text: "See class, attendance, and Quran progress.", icon: Users },
  { href: "/admin/parents", label: "Parents", text: "Update guardian contact and portal access.", icon: Contact },
  { href: "/admin/billing", label: "Tuition records", text: "Mark paid, due, or late. No card charges.", icon: Receipt },
  { href: "/admin/reports", label: "Reports", text: "A calm summary of the school this month.", icon: ClipboardList },
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
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-green-soft/60 px-6 py-6 md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Welcome</p>
          <h1 className="mt-2 font-display text-3xl text-green md:text-4xl">
            {user?.tenantName ?? "Your school"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Peace be upon you. Here is a quiet view of your school today. Choose a task below when you
            are ready.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 md:grid-cols-3 md:p-8">
          {cards.map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-cream px-4 py-4">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 font-display text-3xl text-green">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-green">Common tasks</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TASKS.map((task) => {
            const Icon = task.icon;
            return (
              <Link key={task.href} href={task.href} className="card group p-5 no-underline">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green text-white">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-green">{task.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{task.text}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Report = {
  students: number;
  enrolled: number;
  pending: number;
  classes: number;
  staff: number;
  tuition: { paid: number; due: number; late: number };
  expenses: { salary: number; rent: number; equipment: number; other: number };
};

export default function AdminHomePage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
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
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">School overview</h3>
        <p className="mt-1 text-muted">Records stay inside this dugsi. Other schools cannot see this data.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-green">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

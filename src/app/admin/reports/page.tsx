"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Report = {
  students: number;
  enrolled: number;
  classes: number;
  staff: number;
  tuition: { paid: number; due: number; late: number };
  expenses: { salary: number; rent: number; equipment: number; other: number };
  expenseTotal: number;
  emails: Array<{ id: string; toEmail: string; subject: string; event: string; createdAt: string }>;
};

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
  }, []);

  if (!report) return <p>Loading this school's report...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="A simple summary of students, tuition, and expenses." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted">Students</p>
          <p className="text-3xl text-green">{report.students}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Tuition recorded</p>
          <p className="text-3xl text-paid">${report.tuition.paid.toFixed(0)}</p>
          <p className="text-sm text-due">Due ${report.tuition.due.toFixed(0)}</p>
          <p className="text-sm text-late">Late ${report.tuition.late.toFixed(0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Expenses</p>
          <p className="text-3xl text-green">${report.expenseTotal.toFixed(0)}</p>
          <p className="text-sm">Salary ${report.expenses.salary.toFixed(0)}</p>
          <p className="text-sm">Rent ${report.expenses.rent.toFixed(0)}</p>
          <p className="text-sm">Equipment ${report.expenses.equipment.toFixed(0)}</p>
        </div>
      </div>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Email log</th>
              <th>To</th>
              <th>Event</th>
            </tr>
          </thead>
          <tbody>
            {report.emails.map((email) => (
              <tr key={email.id}>
                <td>{email.subject}</td>
                <td>{email.toEmail}</td>
                <td>{email.event}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

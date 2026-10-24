"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";
import { downloadTableCsv } from "@/lib/table-csv";
import { downloadTablePdf } from "@/lib/table-pdf";

type Report = {
  enrolled: number;
  waiting?: number;
  pending: number;
  progress: { on_track: number; needs_practice: number; contact_parent: number; none: number };
  tuition: { paid: number; due: number; late: number };
  expenseTotal: number;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [schoolName, setSchoolName] = useState("Administrative Reports");
  const [fridayNote, setFridayNote] = useState("");
  const [fridayPending, setFridayPending] = useState(false);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
    api<{ user: { tenantName?: string | null } }>("/api/auth/me")
      .then((data) => setSchoolName(data.user.tenantName ?? "Administrative Reports"))
      .catch(() => setSchoolName("Administrative Reports"));
  }, []);

  const waiting = report?.waiting ?? report?.pending ?? 0;

  function snapshotRows() {
    if (!report) return [];
    return [
      { section: "Enrollment", item: "Enrolled", value: String(report.enrolled) },
      { section: "Enrollment", item: "Waiting for Assessment", value: String(waiting) },
      { section: "Qur’an Progress", item: "On Track", value: String(report.progress.on_track) },
      { section: "Qur’an Progress", item: "Need Practice", value: String(report.progress.needs_practice) },
      { section: "Qur’an Progress", item: "Need Support", value: String(report.progress.contact_parent) },
      { section: "Qur’an Progress", item: "Without Progress Records", value: String(report.progress.none) },
      { section: "Finance", item: "Paid", value: money(report.tuition.paid) },
      { section: "Finance", item: "Due", value: money(report.tuition.due) },
      { section: "Finance", item: "Late", value: money(report.tuition.late) },
      { section: "Finance", item: "Expenses", value: money(report.expenseTotal) },
    ];
  }

  function exportPdf() {
    downloadTablePdf({
      title: schoolName,
      subtitle: "Administrative reports overview",
      filename: "administrative-reports.pdf",
      columns: [
        { key: "section", label: "Section", x: 36 },
        { key: "item", label: "Record", x: 200 },
        { key: "value", label: "Value", x: 420 },
      ],
      rows: snapshotRows(),
    });
  }

  function exportExcel() {
    downloadTableCsv({
      filename: "administrative-reports.csv",
      columns: [
        { key: "section", label: "Section" },
        { key: "item", label: "Record" },
        { key: "value", label: "Value" },
      ],
      rows: snapshotRows(),
    });
  }

  async function emailFridayReport() {
    setFridayNote("");
    setFridayPending(true);
    try {
      const data = await api<{ report: { sent: number; skipped: number; weekLabel: string } }>("/api/reports/friday", {
        method: "POST",
      });
      if (data.report.sent) {
        setFridayNote(`Friday leadership email sent. ${data.report.weekLabel}`);
      } else if (data.report.skipped) {
        setFridayNote(`Already sent this week. ${data.report.weekLabel}`);
      } else {
        setFridayNote("No leadership recipients were found.");
      }
    } catch (err) {
      setFridayNote(err instanceof Error ? err.message : "Could not send the Friday report.");
    } finally {
      setFridayPending(false);
    }
  }

  return (
    <div className="page-stack report-page">
      <PageHeader
        title="Reports Overview"
        description="Official school numbers and records. Open Performance for analysis, or Qur’an Progress for each student’s Juz, Surah, and ayah."
      />

      {!report ? (
        <div className="card empty-state">
          <p className="empty-state-title">Loading reports</p>
          <p className="empty-state-text">Gathering this school’s official numbers.</p>
        </div>
      ) : (
        <>
          <section className="card report-section">
            <div className="report-section-top">
              <h2 className="report-section-title">Enrollment</h2>
              <Link href="/admin/enrollment" className="btn btn-primary">View Enrollment Report</Link>
            </div>
            <div className="report-metrics">
              <div className="report-metric">
                <p className="report-metric-value is-paid">{report.enrolled}</p>
                <p className="report-metric-label">Enrolled</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-due">{waiting}</p>
                <p className="report-metric-label">Waiting for Assessment</p>
              </div>
            </div>
          </section>

          <section className="card report-section">
            <div className="report-section-top">
              <h2 className="report-section-title">Qur’an Progress</h2>
              <Link href="/admin/progress" className="btn btn-primary">View Qur’an Report</Link>
            </div>
            <div className="report-metrics">
              <div className="report-metric">
                <p className="report-metric-value is-paid">{report.progress.on_track}</p>
                <p className="report-metric-label">On Track</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-due">{report.progress.needs_practice}</p>
                <p className="report-metric-label">Need Practice</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-late">{report.progress.contact_parent}</p>
                <p className="report-metric-label">Need Support</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-muted">{report.progress.none}</p>
                <p className="report-metric-label">Without Progress Records</p>
              </div>
            </div>
            <p className="report-note">
              These are official counts. Open Performance if you need trends over time.
            </p>
          </section>

          <section className="card report-section">
            <div className="report-section-top">
              <h2 className="report-section-title">Finance</h2>
              <Link href="/admin/billing" className="btn btn-primary">View Finance Report</Link>
            </div>
            <div className="report-metrics">
              <div className="report-metric">
                <p className="report-metric-value is-paid">{money(report.tuition.paid)}</p>
                <p className="report-metric-label">Paid</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-due">{money(report.tuition.due)}</p>
                <p className="report-metric-label">Due</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value is-late">{money(report.tuition.late)}</p>
                <p className="report-metric-label">Late</p>
              </div>
              <div className="report-metric">
                <p className="report-metric-value">{money(report.expenseTotal)}</p>
                <p className="report-metric-label">Expenses</p>
              </div>
            </div>
          </section>

          <section className="card report-section">
            <h2 className="report-section-title">Official records</h2>
            <div className="report-official">
              <div className="report-official-row">
                <p className="report-official-label">Attendance report</p>
                <Link href="/admin/attendance" className="btn btn-ghost">Open</Link>
              </div>
              <div className="report-official-row">
                <p className="report-official-label">Class roster report</p>
                <Link href="/admin/students" className="btn btn-ghost">Open</Link>
              </div>
              <div className="report-official-row">
                <p className="report-official-label">Staff report</p>
                <Link href="/admin/staff" className="btn btn-ghost">Open</Link>
              </div>
              <div className="report-official-row">
                <p className="report-official-label">Expense report</p>
                <Link href="/admin/expenses" className="btn btn-ghost">Open</Link>
              </div>
              <div className="report-official-row">
                <div>
                  <p className="report-official-label">Weekly leadership report</p>
                  {fridayNote ? <p className="report-note">{fridayNote}</p> : null}
                </div>
                <button type="button" className="btn btn-ghost" disabled={fridayPending} onClick={emailFridayReport}>
                  {fridayPending ? "Sending..." : "Email Friday Report"}
                </button>
              </div>
              <div className="report-official-row">
                <p className="report-official-label">Download overview</p>
                <div className="report-official-actions">
                  <button type="button" className="btn btn-ghost" onClick={exportPdf}>Download PDF</button>
                  <button type="button" className="btn btn-ghost" onClick={exportExcel}>Download Excel</button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

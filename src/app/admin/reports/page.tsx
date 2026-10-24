"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";
import { downloadLeadershipPdf } from "@/lib/leadership-pdf";
import { downloadTableCsv } from "@/lib/table-csv";
import type { Session } from "@/lib/types";

type Report = {
  enrolled: number;
  waiting?: number;
  pending: number;
  progress: { on_track: number; needs_practice: number; contact_parent: number; none: number };
  tuition: { paid: number; due: number; late: number };
  expenseTotal: number;
};

type FridayEmail = {
  subject: string;
  body: string;
  html: string;
};

type FridaySent = {
  subject: string;
  toEmail: string;
  createdAt: string;
  status: string;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [schoolName, setSchoolName] = useState("Administrative Reports");
  const [adminName, setAdminName] = useState("");
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [fridayOpen, setFridayOpen] = useState(false);
  const [fridayPending, setFridayPending] = useState(false);
  const [fridayError, setFridayError] = useState("");
  const [fridayEmail, setFridayEmail] = useState<FridayEmail | null>(null);
  const [fridaySent, setFridaySent] = useState<FridaySent | null>(null);

  useEffect(() => {
    api<{ report: Report }>("/api/reports").then((data) => setReport(data.report));
    api<{ user: Session }>("/api/auth/me")
      .then((data) => {
        setSchoolName(data.user.tenantName ?? "Administrative Reports");
        setAdminName(data.user.name ?? "");
      })
      .catch(() => setSchoolName("Administrative Reports"));
    api<{ tenant: { schoolImageUrl: string | null } }>("/api/settings")
      .then((data) => setSchoolImageUrl(data.tenant.schoolImageUrl))
      .catch(() => setSchoolImageUrl(null));
  }, []);

  useEffect(() => {
    if (!fridayOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFridayOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fridayOpen]);

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

  async function exportPdf() {
    if (!report) return;
    setPdfError("");
    setPdfPending(true);
    try {
      await downloadLeadershipPdf({
        schoolName,
        adminName,
        schoolImageUrl,
        enrolled: report.enrolled,
        waiting,
        onTrack: report.progress.on_track,
        needPractice: report.progress.needs_practice,
        needSupport: report.progress.contact_parent,
        noRecord: report.progress.none,
        paid: report.tuition.paid,
        due: report.tuition.due,
        late: report.tuition.late,
        expenses: report.expenseTotal,
      });
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Could not create the weekly report.");
    } finally {
      setPdfPending(false);
    }
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

  function sentWhen(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function openFridayReport() {
    setFridayError("");
    setFridayEmail(null);
    setFridaySent(null);
    setFridayPending(true);
    setFridayOpen(true);
    try {
      const data = await api<{ friday: { preview: FridayEmail; lastSent: FridaySent | null } }>("/api/reports/friday");
      setFridayEmail(data.friday.preview);
      setFridaySent(data.friday.lastSent);
    } catch (err) {
      setFridayEmail(null);
      setFridayError(err instanceof Error ? err.message : "Could not load the last Friday email.");
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
                <p className="report-official-label">Weekly leadership report</p>
                <button type="button" className="btn btn-ghost" disabled={fridayPending} onClick={openFridayReport}>
                  {fridayPending ? "Opening..." : "View Friday Report"}
                </button>
              </div>
              <div className="report-official-row">
                <p className="report-official-label">Download overview</p>
                <div className="report-official-actions">
                  <button type="button" className="btn btn-ghost" disabled={pdfPending} onClick={exportPdf}>
                    {pdfPending ? "Preparing..." : "Download PDF"}
                  </button>
                  {pdfError ? <p className="report-note">{pdfError}</p> : null}
                  <button type="button" className="btn btn-ghost" onClick={exportExcel}>Download Excel</button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {fridayOpen ? (
        <div className="report-modal" onClick={() => setFridayOpen(false)}>
          <div className="report-modal-panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="friday-report-title">
            <div className="report-modal-top">
              <h2 id="friday-report-title" className="report-section-title">Friday leadership email</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setFridayOpen(false)}>Close</button>
            </div>
            <p className="report-note">
              This email is sent automatically on Friday. Nothing was sent just now.
            </p>
            {fridaySent ? <p className="record-meta">Last emailed {sentWhen(fridaySent.createdAt)}</p> : null}
            {fridayPending ? <p className="page-copy">Loading this week’s snapshot...</p> : null}
            {fridayError ? <p className="mt-0 text-sm text-late">{fridayError}</p> : null}
            {fridayEmail?.html ? (
              <iframe
                className="report-email-frame"
                title={fridayEmail.subject}
                srcDoc={fridayEmail.html}
                sandbox=""
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

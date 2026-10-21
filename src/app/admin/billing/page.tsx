"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { downloadTuitionPdf } from "@/lib/tuition-pdf";
import type { Session } from "@/lib/types";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  period: string | null;
  student: { firstName: string; lastName: string };
};

type Student = { id: string; firstName: string; lastName: string };
type StatusFilter = "all" | "paid" | "due" | "late";

const PAGE_SIZE = 25;
const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "due", label: "Due" },
  { id: "late", label: "Late" },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolName, setSchoolName] = useState("Tuition records");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  async function load() {
    const [invoiceData, studentData, sessionData] = await Promise.all([
      api<{ invoices: Invoice[] }>("/api/invoices"),
      api<{ students: Student[] }>("/api/students"),
      api<{ user: Session }>("/api/auth/me"),
    ]);
    setInvoices(invoiceData.invoices);
    setStudents(studentData.students);
    setSchoolName(sessionData.user.tenantName ?? "Tuition records");
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => invoices.filter((invoice) => filter === "all" || invoice.status === filter),
    [filter, invoices],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const total = filtered.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const filterLabel = FILTERS.find((item) => item.id === filter)?.label ?? "All";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    await api("/api/invoices", {
      method: "POST",
      body: JSON.stringify({ ...raw, amount: Number(raw.amount) }),
    });
    form.reset();
    setMessage("Billing record saved. This is documentation only, not a payment charge.");
    await load();
  }

  async function recordPayment(id: string) {
    await api(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "record-payment" }),
    });
    setMessage("Payment recorded as green/paid and a parent email was sent.");
    await load();
  }

  function exportPdf() {
    downloadTuitionPdf({
      schoolName,
      filterLabel,
      total: `$${total.toFixed(2)}`,
      rows: filtered.map((invoice) => ({
        student: `${invoice.student.firstName} ${invoice.student.lastName}`,
        amount: `$${Number(invoice.amount).toFixed(2)}`,
        dueDate: invoice.dueDate,
        status: invoice.status,
      })),
    });
  }

  return (
    <div className="page-stack">
      <PageHeader title="Tuition" description="Green is paid, yellow is due, red is late. This is a record, not a payment page." />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Student">
          <select className="select" name="studentId" required>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Amount"><input className="input" name="amount" type="number" step="0.01" required /></FormField>
        <FormField label="Due date"><input className="input" name="dueDate" type="date" required /></FormField>
        <FormField label="Period"><input className="input" name="period" placeholder="October 2026" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Add billing record</button>
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>

      <section className="card" style={{ padding: "1.1rem 1.2rem", display: "grid", gap: "0.85rem" }}>
        <p className="metric-label">Filter records</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={exportPdf} disabled={filtered.length === 0}>
            Export PDF
          </button>
        </div>
        <p className="page-copy">
          {filtered.length === 0
            ? `No ${filter === "all" ? "" : `${filter} `}records yet.`
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} · ${filterLabel} total $${total.toFixed(2)}`}
        </p>
      </section>

      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5}>No billing records match this filter.</td>
              </tr>
            ) : (
              visible.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.student.firstName} {invoice.student.lastName}</td>
                  <td>${Number(invoice.amount).toFixed(2)}</td>
                  <td>{invoice.dueDate}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td>
                    {invoice.status !== "paid" ? (
                      <button className="btn btn-ghost py-1 text-xs" onClick={() => recordPayment(invoice.id)}>
                        Record paid
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn btn-ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Previous
          </button>
          <p className="page-copy" style={{ margin: 0 }}>Page {currentPage} of {pageCount}</p>
          <button className="btn btn-ghost" type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

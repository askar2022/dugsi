"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  period: string | null;
  studentId?: string;
  student?: { id?: string; firstName: string; lastName: string } | { id?: string; firstName: string; lastName: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function remainingOf(status: string, amount: number) {
  return status === "paid" ? 0 : Number(amount || 0);
}

export default function ParentBillingPage() {
  const { children, ready } = useParentFamily();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api<{ invoices: Invoice[] }>("/api/invoices")
      .then((data) => setInvoices(data.invoices))
      .catch(() => setInvoices([]));
  }, []);

  const rows = useMemo(() => {
    return invoices.map((invoice) => {
      const student = one(invoice.student);
      return {
        ...invoice,
        childId: invoice.studentId ?? student?.id ?? "",
        child: student ? `${student.firstName} ${student.lastName}` : "Child",
        remaining: remainingOf(invoice.status, invoice.amount),
      };
    });
  }, [invoices]);

  const byChild = useMemo(() => {
    return children.map((child) => {
      const bills = rows.filter((row) => row.childId === child.id);
      const paid = bills.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const due = bills.filter((row) => row.status === "due").reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const late = bills.filter((row) => row.status === "late").reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const remaining = due + late;
      const status = late ? "late" : remaining ? "due" : bills.length ? "paid" : "pending";
      return { child, paid, due, late, remaining, bills: bills.length, status };
    });
  }, [children, rows]);

  const totals = useMemo(() => {
    const paid = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const remaining = rows.reduce((sum, row) => sum + row.remaining, 0);
    return { paid, remaining, billed: paid + remaining };
  }, [rows]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition"
        description="See every child in one list. Green is paid. Yellow is still due. Red is late. Pay at the dugsi — this is a record, not a payment page."
      />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family tuition." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : (
        <>
          <section>
            <div className="metric-grid">
              <article className="card metric-card is-paid">
                <p className="metric-label">Paid</p>
                <p className="metric-value">{money(totals.paid)}</p>
                <p className="metric-detail">Already paid for this family</p>
              </article>
              <article className="card metric-card is-due">
                <p className="metric-label">Remaining due</p>
                <p className="metric-value">{money(totals.remaining)}</p>
                <p className="metric-detail">Still to pay at the dugsi</p>
              </article>
              <article className="card metric-card is-green">
                <p className="metric-label">Total billed</p>
                <p className="metric-value">{money(totals.billed)}</p>
                <p className="metric-detail">Paid plus remaining</p>
              </article>
            </div>
          </section>

          <section className="card table-wrap p-2">
            <table>
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {byChild.map((row) => (
                  <tr key={row.child.id}>
                    <td>{childName(row.child)}</td>
                    <td>{money(row.paid)}</td>
                    <td>{money(row.remaining)}</td>
                    <td>
                      <StatusBadge status={row.bills === 0 ? "no_record" : row.status} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Family total</strong></td>
                  <td><strong>{money(totals.paid)}</strong></td>
                  <td><strong>{money(totals.remaining)}</strong></td>
                  <td>{totals.remaining ? <StatusBadge status="due" /> : <StatusBadge status="paid" />}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {rows.length === 0 ? (
            <EmptyState
              title="No tuition records yet"
              text="Tuition records will appear when the school adds a bill. Pay at the dugsi."
            />
          ) : (
            <section className="card table-wrap p-2">
              <table>
                <thead>
                  <tr>
                    <th>Child</th>
                    <th>Period</th>
                    <th>Due date</th>
                    <th>Amount</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.child}</td>
                      <td>{invoice.period || "—"}</td>
                      <td>{invoice.dueDate}</td>
                      <td>{money(invoice.amount)}</td>
                      <td>{money(invoice.remaining)}</td>
                      <td><StatusBadge status={invoice.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}

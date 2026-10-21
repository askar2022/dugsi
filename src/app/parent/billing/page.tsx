"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  studentId?: string;
  student?: { id?: string; firstName: string; lastName: string } | { id?: string; firstName: string; lastName: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
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
    return children.map((child) => {
      const bills = invoices.filter((invoice) => {
        const student = one(invoice.student);
        return invoice.studentId === child.id || student?.id === child.id;
      });
      const paid = bills.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const remaining = bills.filter((item) => item.status !== "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const nextDue = bills
        .filter((item) => item.status !== "paid")
        .map((item) => item.dueDate)
        .sort()[0] ?? "";
      const status = bills.some((item) => item.status === "late")
        ? "late"
        : remaining
          ? "due"
          : bills.length
            ? "paid"
            : "no_record";
      return {
        id: child.id,
        name: childName(child),
        className: classPlaceLabel(child),
        paid,
        remaining,
        nextDue,
        status,
      };
    });
  }, [children, invoices]);

  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0);
  const totalDue = rows.reduce((sum, row) => sum + row.remaining, 0);
  const familyStatus = totalDue ? (rows.some((row) => row.status === "late") ? "late" : "due") : "paid";

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition"
        description="Green is paid. Yellow is due. Red is late. Pay at the dugsi."
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
          <section className={`card family-total is-${familyStatus}`}>
            <p className="metric-label">Family total</p>
            <div className="family-total-grid">
              <div>
                <p className="stat-label">Still due</p>
                <p className="family-total-value">{money(totalDue)}</p>
              </div>
              <div>
                <p className="stat-label">Already paid</p>
                <p className="family-total-value">{money(totalPaid)}</p>
              </div>
            </div>
          </section>
          <section className="family-list">
            {rows.map((row) => (
              <article key={row.id} className={`card family-item is-${row.status}`}>
                <div className="family-item-top">
                  <div>
                    <p className="family-item-name">{row.name}</p>
                    <p className="family-item-class">{row.className}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="family-item-money">{money(row.remaining)}</p>
                <p className="family-item-meta">
                  {row.status === "paid"
                    ? `Paid ${money(row.paid)}`
                    : row.nextDue
                      ? `Due ${row.nextDue}`
                      : "No bill yet"}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

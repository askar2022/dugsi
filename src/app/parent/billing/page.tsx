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

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition"
        description="All of your children in one table. Money is what is still due. Green is paid, yellow is due, red is late. Pay at the dugsi."
      />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family tuition." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : (
        <section className="card table-wrap parent-tuition-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Money</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.className}</td>
                  <td>{money(row.remaining)}</td>
                  <td>
                    <div className="parent-tuition-due">
                      <StatusBadge status={row.status} />
                      {row.nextDue ? <span>{row.nextDue}</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><strong>Family total</strong></td>
                <td><strong>{money(totalDue)}</strong></td>
                <td>
                  <StatusBadge status={totalDue ? (rows.some((row) => row.status === "late") ? "late" : "due") : "paid"} />
                  <span className="parent-tuition-paid">Paid {money(totalPaid)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Invoice = {
  id: string;
  amount: number;
  dueDate: string;
  status: string;
  period: string | null;
  student: { firstName: string; lastName: string };
};

export default function ParentBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api<{ invoices: Invoice[] }>("/api/invoices").then((data) => setInvoices(data.invoices));
  }, []);

  return (
    <div className="page-stack">
      <PageHeader title="Tuition" description="Green is paid, yellow is due, red is late. This is a record, not a payment page." />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Child</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.student.firstName} {invoice.student.lastName}</td>
                <td>{invoice.period}</td>
                <td>${invoice.amount.toFixed(2)}</td>
                <td><StatusBadge status={invoice.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

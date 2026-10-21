"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
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
};

export default function ParentBillingPage() {
  const { children, child, childId, selectChild, ready } = useParentFamily();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!childId) {
      setInvoices([]);
      return;
    }
    api<{ invoices: Invoice[] }>(`/api/invoices?studentId=${encodeURIComponent(childId)}`)
      .then((data) => setInvoices(data.invoices))
      .catch(() => setInvoices([]));
  }, [childId]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Tuition"
        description="Green is paid, yellow is due, red is late. This is a record, not a payment page."
      />
      <ChildSwitcher children={children} childId={childId} onSelect={selectChild} />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No tuition records yet"
          text={`Tuition records will appear when the school adds a bill for ${child ? child.firstName : "this child"}. Pay at the dugsi.`}
        />
      ) : (
        <div className="record-list">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="card record-card">
              <div>
                <p className="record-title">${Number(invoice.amount).toFixed(2)}</p>
                <p className="record-meta">
                  {child ? childName(child) : "Your child"}
                  {invoice.period ? ` · ${invoice.period}` : ""}
                  {` · due ${invoice.dueDate}`}
                </p>
              </div>
              <StatusBadge status={invoice.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

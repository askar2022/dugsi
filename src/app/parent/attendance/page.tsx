"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

type Row = {
  id: string;
  date: string;
  status: string;
  class?: { name: string } | null;
};

export default function ParentAttendancePage() {
  const { children, child, childId, selectChild, ready } = useParentFamily();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!childId) {
      setRows([]);
      return;
    }
    api<{ attendance: Row[] }>(`/api/attendance?studentId=${encodeURIComponent(childId)}`)
      .then((data) => setRows(data.attendance))
      .catch(() => setRows([]));
  }, [childId]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Attendance"
        description={child ? `See how ${child.firstName} has been marked.` : "See how your child has been marked."}
      />
      <ChildSwitcher children={children} childId={childId} onSelect={selectChild} />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No attendance yet"
          text={`Attendance will appear after ${child ? child.firstName + "'s" : "your child's"} first class.`}
        />
      ) : (
        <div className="record-list">
          {rows.map((row) => (
            <article key={row.id} className="card record-card">
              <div>
                <p className="record-title">{row.date}</p>
                <p className="record-meta">
                  {child ? childName(child) : "Your child"}
                  {row.class?.name ? ` · ${row.class.name}` : ""}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

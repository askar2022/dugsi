"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { classPlaceLabel } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";

type Mark = {
  id: string;
  date: string;
  status: string;
  studentId?: string;
  student?: { id?: string; firstName: string; lastName: string } | { id?: string; firstName: string; lastName: string }[] | null;
  class?: { name: string } | { name: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function ParentAttendancePage() {
  const { children, ready } = useParentFamily();
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    api<{ attendance: Mark[] }>("/api/attendance")
      .then((data) => setMarks(data.attendance))
      .catch(() => setMarks([]));
  }, []);

  const rows = useMemo(() => {
    return children.map((child) => {
      const latest = marks.find((mark) => {
        const student = one(mark.student);
        return mark.studentId === child.id || student?.id === child.id;
      });
      return {
        id: child.id,
        name: childName(child),
        className: classPlaceLabel(child),
        date: latest?.date ?? "",
        status: latest?.status ?? "no_record",
      };
    });
  }, [children, marks]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Attendance"
        description="Green is present. Yellow is late. Red is absent."
      />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family attendance." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : (
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
              <p className="family-item-money">{row.date || "No class yet"}</p>
              <p className="family-item-meta">
                {row.status === "no_record" ? "No attendance yet" : row.status.replaceAll("_", " ")}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

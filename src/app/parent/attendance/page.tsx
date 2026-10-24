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
  const [query, setQuery] = useState("");

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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.className, row.date, row.status.replaceAll("_", " ")].join(" ").toLowerCase().includes(needle),
    );
  }, [query, rows]);

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
        <>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a child, class, date, or status..."
          />
          {visible.length === 0 ? (
            <EmptyState title="No matching attendance" text="No child matches that search." />
          ) : (
        <div className="card table-wrap p-2">
          <table className="family-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Class</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className={`is-${row.status}`}>
                  <td>{row.name}</td>
                  <td>{row.className}</td>
                  <td>{row.date || "—"}</td>
                  <td><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}

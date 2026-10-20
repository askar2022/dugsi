"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Row = {
  id: string;
  date: string;
  status: string;
  student: { firstName: string; lastName: string };
};

export default function ParentAttendancePage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    api<{ attendance: Row[] }>("/api/attendance").then((data) => setRows(data.attendance));
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Attendance</h3>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Child</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.student.firstName} {row.student.lastName}</td>
                <td>{row.date}</td>
                <td><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

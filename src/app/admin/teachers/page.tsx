"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Teacher = { id: string; name: string; email: string; phone: string | null };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<{ teachers: Teacher[] }>("/api/staff").then((data) => setTeachers(data.teachers));
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((teacher) =>
      `${teacher.name} ${teacher.email} ${teacher.phone ?? ""}`.toLowerCase().includes(needle),
    );
  }, [query, teachers]);

  return (
    <div className="page-stack">
      <PageHeader title="Teachers" description="Teachers at your school." />
      <input
        className="input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a teacher, email, or phone..."
      />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  {teachers.length === 0
                    ? "No teachers yet. Add them under Staff."
                    : "No teacher matches that search."}
                </td>
              </tr>
            ) : (
              rows.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.name}</td>
                  <td>{teacher.email}</td>
                  <td>{teacher.phone ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

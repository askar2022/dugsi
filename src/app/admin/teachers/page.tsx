"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Teacher = { id: string; name: string; email: string; phone: string | null };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    api<{ teachers: Teacher[] }>("/api/staff").then((data) => setTeachers(data.teachers));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Teachers" description="Teachers at your school." />
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
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={3}>No teachers yet. Add them under Staff.</td>
              </tr>
            ) : (
              teachers.map((teacher) => (
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

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Teacher = { id: string; name: string; email: string; phone: string | null };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    api<{ teachers: Teacher[] }>("/api/staff").then((data) => setTeachers(data.teachers));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Teachers</h3>
        <p className="text-muted">Teacher logins belong to this dugsi and cannot open another school.</p>
      </div>
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
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>{teacher.name}</td>
                <td>{teacher.email}</td>
                <td>{teacher.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  class?: { name: string } | null;
  parent?: { name: string; email: string } | null;
};

export default function StudentsRosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api<{ students: Student[] }>("/api/students").then((data) => setStudents(data.students));
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      const haystack = [
        student.firstName,
        student.lastName,
        student.class?.name,
        student.parent?.name,
        student.status,
      ]
        .join(" ")
        .toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [query, students]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Students"
        description="Enrolled children for this dugsi. Attendance and Quran progress are on Classes and the Teacher Portal."
      />
      <input
        className="input max-w-md"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, class, parent, or status"
      />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Parent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>No students match. Review applications under Enrollment.</td>
              </tr>
            ) : (
              rows.map((student) => (
                <tr key={student.id}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.class?.name ?? "—"}</td>
                  <td>{student.parent?.name ?? "—"}</td>
                  <td><StatusBadge status={student.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

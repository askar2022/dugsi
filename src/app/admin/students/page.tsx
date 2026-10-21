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

type Attendance = { studentId: string; date: string; status: string };
type Progress = { studentId: string; surah: string; ayahFrom: number; ayahTo: number; date: string };

export default function StudentsRosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
      api<{ progress: Progress[] }>("/api/progress"),
    ]).then(([studentData, attendanceData, progressData]) => {
      setStudents(studentData.students);
      setAttendance(attendanceData.attendance);
      setProgress(progressData.progress);
    });
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => {
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
      })
      .map((student) => {
        const lastMark = attendance.find((item) => item.studentId === student.id);
        const lastProgress = progress.find((item) => item.studentId === student.id);
        return {
          student,
          attendance: lastMark ? `${lastMark.status} (${lastMark.date})` : "—",
          progress: lastProgress
            ? `${lastProgress.surah} ${lastProgress.ayahFrom}–${lastProgress.ayahTo}`
            : "—",
        };
      });
  }, [attendance, progress, query, students]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Student roster. Students do not have their own login. Parents and teachers use this record."
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
              <th>Attendance</th>
              <th>Quran progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>No students match. Register a child under Enrollment.</td>
              </tr>
            ) : (
              rows.map(({ student, attendance: mark, progress: quran }) => (
                <tr key={student.id}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.class?.name ?? "—"}</td>
                  <td>{student.parent?.name ?? "—"}</td>
                  <td>{mark}</td>
                  <td>{quran}</td>
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

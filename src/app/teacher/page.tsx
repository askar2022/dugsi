"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class?: { name: string } | null;
};

type Attendance = {
  id: string;
  status: string;
  studentId: string;
};

export default function TeacherHomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ attendance: Attendance[] }>(`/api/attendance?date=${today}`),
    ]).then(([studentData, attendanceData]) => {
      setStudents(studentData.students);
      setAttendance(attendanceData.attendance);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">My class</h3>
        <p className="text-muted">You only see students assigned to your class in this dugsi.</p>
      </div>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const mark = attendance.find((item) => item.studentId === student.id);
              return (
                <tr key={student.id}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.class?.name ?? "—"}</td>
                  <td>{mark ? <StatusBadge status={mark.status} /> : "Not marked"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

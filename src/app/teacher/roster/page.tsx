"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { quranPortion } from "@/lib/quran";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status?: string;
  class?: { name?: string } | null;
};

type Attendance = { studentId: string; status: string };
type Progress = {
  studentId?: string;
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz?: number | null;
  status?: string | null;
  student?: { id: string };
};

function isActiveStudent(student: Student) {
  return (
    student.status !== "unenrolled" &&
    student.status !== "declined" &&
    student.status !== "pending" &&
    student.status !== "waiting_assessment" &&
    student.status !== "ready_for_class"
  );
}

export default function TeacherRosterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ attendance: Attendance[] }>(`/api/attendance?date=${today}`),
      api<{ progress: Progress[] }>("/api/progress"),
    ]).then(([studentData, attendanceData, progressData]) => {
      setStudents(studentData.students);
      setAttendance(attendanceData.attendance);
      setProgress(progressData.progress);
    });
  }, []);

  const roster = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (!isActiveStudent(student)) return false;
      if (!needle) return true;
      return `${student.firstName} ${student.lastName} ${student.class?.name ?? ""}`.toLowerCase().includes(needle);
    });
  }, [query, students]);

  return (
    <div className="page-stack">
      <div className="homework-head">
        <h1 className="page-title">Class Roster</h1>
      </div>
      {students.filter(isActiveStudent).length === 0 ? (
        <EmptyState title="No students yet" text="Students appear here after the office places them in your class." />
      ) : (
        <>
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a student..."
          />
        {roster.length === 0 ? (
          <EmptyState title="No matching students" text="No student in your class matches that name." />
        ) : (
        <div className="record-list">
          {roster.map((student) => {
            const mark = attendance.find((item) => item.studentId === student.id);
            const quran = progress.find((item) => item.studentId === student.id || item.student?.id === student.id);
            return (
              <Link key={student.id} href={`/teacher/students/${student.id}`} className="card record-card teacher-feed-row">
                <div>
                  <p className="record-title">{student.firstName} {student.lastName}</p>
                  <p className="record-meta">
                    {student.class?.name ?? "Your class"}
                    {quran ? ` · ${quranPortion(quran) || quran.surah}` : " · No Quran progress yet"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {quran?.status ? <StatusBadge status={quran.status} /> : null}
                  {mark ? <StatusBadge status={mark.status} /> : <span className="record-meta">Not marked</span>}
                </div>
              </Link>
            );
          })}
        </div>
        )}
        </>
      )}
    </div>
  );
}

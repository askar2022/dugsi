"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ClipboardList, Users } from "lucide-react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { Session } from "@/lib/types";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  class?: { name: string } | null;
};

type Attendance = { studentId: string; status: string };
type Progress = {
  studentId?: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz?: number | null;
  student?: { id: string };
};

const TASKS = [
  { href: "/teacher", label: "Class Roster", text: "See every student in your class.", icon: Users },
  { href: "/teacher/attendance", label: "Attendance", text: "Mark who is present today.", icon: CalendarDays },
  { href: "/teacher/progress", label: "Quran Progress", text: "Record the verses a student has reached.", icon: BookOpen },
  { href: "/teacher/homework", label: "Homework", text: "Assign work and remind families.", icon: ClipboardList },
];

export default function TeacherHomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [user, setUser] = useState<Session | null>(null);
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api<{ user: Session }>("/api/auth/me").then((data) => setUser(data.user));
    api<{ tenant: { schoolImageUrl: string | null } }>("/api/settings")
      .then((data) => setSchoolImageUrl(data.tenant.schoolImageUrl))
      .catch(() => setSchoolImageUrl(null));
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

  return (
    <div className="page-stack">
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Teacher Portal</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Your class is here.
            Mark attendance, record Quran progress, and send homework when you are ready.
          </p>
        </div>
        <div className="hero-art">
          <SchoolImage
            src={schoolImageUrl}
            name={user?.tenantName}
            tone="classroom"
            alt={user?.tenantName ?? "School"}
            message={user?.tenantName ?? "Your classroom"}
          />
        </div>
      </section>

      <section>
        <h2 className="page-title" style={{ fontSize: "1.7rem" }}>
          Classroom
        </h2>
        <div className="tile-grid" style={{ marginTop: "1rem" }}>
          {TASKS.map((task) => {
            const Icon = task.icon;
            return (
              <Link key={task.label} href={task.href} className="card tile">
                <span className="tile-icon">
                  <Icon size={22} />
                </span>
                <p className="tile-label">{task.label}</p>
                <p className="tile-meta">{task.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ padding: "1.1rem 1.1rem 1.2rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.4rem" }}>My class</h2>
        <p className="page-copy">Today's attendance and the latest Quran progress.</p>
        {students.length === 0 ? (
          <p className="page-copy">No students in your assigned class yet.</p>
        ) : (
          <div className="record-list" style={{ marginTop: "1rem" }}>
            {students.map((student) => {
              const mark = attendance.find((item) => item.studentId === student.id);
              const quran = progress.find((item) => item.studentId === student.id || item.student?.id === student.id);
              return (
                <article key={student.id} className="record-card">
                  <div>
                    <p className="record-title">{student.firstName} {student.lastName}</p>
                    <p className="record-meta">
                      {student.class?.name ?? "Your class"}
                      {quran
                        ? ` · ${quran.surah}${quran.juz ? ` · Juz ${quran.juz}` : ""} · Ayah ${quran.ayahFrom}–${quran.ayahTo}`
                        : " · No Quran progress yet"}
                    </p>
                  </div>
                  {mark ? <StatusBadge status={mark.status} /> : <span className="record-meta">Not marked</span>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

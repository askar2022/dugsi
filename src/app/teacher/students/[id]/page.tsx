"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { homeworkAssignedToStudent } from "@/lib/performance";
import { homeworkCompletionCounts } from "@/lib/homework";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { completedJuzes, quranPortion } from "@/lib/quran";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  classId?: string | null;
  class?: { name?: string } | null;
  parent?: { name?: string; email?: string; phone?: string | null } | null;
};

type Progress = {
  surah: string;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  juz: number | null;
  date: string;
  status?: string | null;
};

type Attendance = { status: string; date: string };

type Homework = {
  id: string;
  title: string;
  dueDate?: string | null;
  studentId?: string | null;
  classId: string;
  completions?: Array<{ studentId: string; status: string }>;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TeacherStudentPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      api<{ student: Student }>(`/api/students/${params.id}`),
      api<{ progress: Progress[] }>(`/api/progress?studentId=${params.id}`),
      api<{ attendance: Attendance[] }>(`/api/attendance?studentId=${params.id}`),
      api<{ homework: Homework[] }>("/api/homework"),
    ])
      .then(([studentData, progressData, attendanceData, homeworkData]) => {
        const row = studentData.student;
        setStudent({
          ...row,
          class: one(row.class),
          parent: one(row.parent),
        });
        setProgress(progressData.progress);
        setAttendance(attendanceData.attendance);
        setHomework(homeworkData.homework);
      })
      .catch(() => setMissing(true));
  }, [params.id]);

  const latest = progress[0];
  const finished = useMemo(() => completedJuzes(progress), [progress]);
  const present = attendance.filter((row) => row.status === "present").length;
  const late = attendance.filter((row) => row.status === "late").length;
  const absent = attendance.filter((row) => row.status === "absent").length;
  const assigned = useMemo(() => {
    if (!student) return [];
    return homework.filter((item) => homeworkAssignedToStudent(item, student));
  }, [homework, student]);

  if (missing) {
    return (
      <div className="page-stack">
        <PageHeader title="Student not found" description="This child is not in your assigned class." />
        <Link href="/teacher" className="btn btn-ghost">Back to Home</Link>
      </div>
    );
  }

  if (!student) return <p>Loading student...</p>;

  return (
    <div className="page-stack">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={student.class?.name ?? "Your class"}
      />
      <div className="homework-mini-actions">
        <Link href="/teacher" className="btn btn-ghost">Back to Home</Link>
        <Link href="/teacher/roster" className="btn btn-ghost">Class Roster</Link>
      </div>

      <section className="card teacher-panel">
        <h2 className="teacher-panel-title">Parent contact</h2>
        {student.parent?.name || student.parent?.email || student.parent?.phone ? (
          <>
            {student.parent?.name ? <p className="record-title">{student.parent.name}</p> : null}
            {student.parent?.email ? <p className="record-meta">{student.parent.email}</p> : null}
            {student.parent?.phone ? <p className="record-meta">{student.parent.phone}</p> : null}
          </>
        ) : (
          <p className="record-meta">No parent contact on file.</p>
        )}
      </section>

      <section className="card teacher-panel">
        <div className="homework-mini-top">
          <h2 className="teacher-panel-title">Qur’an progress</h2>
          <Link href="/teacher/progress/record" className="btn btn-ghost">Update</Link>
        </div>
        <p className="record-meta" style={{ marginTop: "0.45rem" }}>
          {latest ? quranPortion(latest) || latest.surah : "No Quran record yet"}
        </p>
        <div style={{ marginTop: "0.7rem" }}>
          <StatusBadge status={latest ? normalizeProgressStatus(latest.status) : "no_record"} />
        </div>
        <p className="record-meta" style={{ marginTop: "0.7rem" }}>{finished.length} Juz completed</p>
      </section>

      <section className="card teacher-panel">
        <div className="homework-mini-top">
          <h2 className="teacher-panel-title">Attendance</h2>
          <Link href="/teacher/attendance" className="btn btn-ghost">Take attendance</Link>
        </div>
        <section className="progress-summary" style={{ marginTop: "0.85rem" }}>
          <article className="progress-stat is-on">
            <p className="progress-stat-value">{present}</p>
            <p className="progress-stat-label">Present</p>
          </article>
          <article className="progress-stat is-attention">
            <p className="progress-stat-value">{late}</p>
            <p className="progress-stat-label">Late</p>
          </article>
          <article className="progress-stat is-support">
            <p className="progress-stat-value">{absent}</p>
            <p className="progress-stat-label">Absent</p>
          </article>
        </section>
        {attendance.length ? (
          <div className="record-list" style={{ marginTop: "0.9rem" }}>
            {attendance.slice(0, 6).map((row) => (
              <div key={`${row.date}-${row.status}`} className="homework-status-row">
                <span>{shortDate(row.date)}</span>
                <StatusBadge status={row.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="record-meta" style={{ marginTop: "0.7rem" }}>No attendance yet.</p>
        )}
      </section>

      <section className="card teacher-panel">
        <div className="homework-mini-top">
          <h2 className="teacher-panel-title">Homework</h2>
          <Link href="/teacher/homework/view" className="btn btn-ghost">Assignments</Link>
        </div>
        {assigned.length === 0 ? (
          <p className="record-meta" style={{ marginTop: "0.55rem" }}>No homework assigned to this student.</p>
        ) : (
          <div className="record-list" style={{ marginTop: "0.85rem" }}>
            {assigned.slice(0, 8).map((item) => {
              const row = (item.completions ?? []).find((completion) => completion.studentId === student.id);
              const counts = homeworkCompletionCounts(item.completions ?? []);
              return (
                <article key={item.id} className="homework-mini">
                  <p className="record-title">{item.title}</p>
                  <p className="record-meta">{item.dueDate ? `Due ${shortDate(item.dueDate)}` : "No due date"}{counts.done ? ` · ${counts.done} completed` : ""}</p>
                  <div style={{ marginTop: "0.45rem" }}>
                    <StatusBadge status={row?.status || "assigned"} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { normalizeProgressStatus } from "@/lib/progress-status";
import { completedJuzes, quranPortion } from "@/lib/quran";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  class?: { name?: string; teacher?: { name?: string } | null } | null;
  parent?: { name?: string; email?: string } | null;
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

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function AdminStudentPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      api<{ student: Student }>(`/api/students/${params.id}`),
      api<{ progress: Progress[] }>(`/api/progress?studentId=${params.id}`),
      api<{ attendance: Attendance[] }>(`/api/attendance?studentId=${params.id}`),
    ])
      .then(([studentData, progressData, attendanceData]) => {
        const row = studentData.student;
        setStudent({
          ...row,
          class: row.class
            ? { ...row.class, teacher: one(row.class.teacher) }
            : null,
          parent: one(row.parent),
        });
        setProgress(progressData.progress);
        setAttendance(attendanceData.attendance);
      })
      .catch(() => setMissing(true));
  }, [params.id]);

  const latest = progress[0];
  const finished = useMemo(() => completedJuzes(progress), [progress]);
  const present = attendance.filter((row) => row.status === "present").length;
  const late = attendance.filter((row) => row.status === "late").length;
  const absent = attendance.filter((row) => row.status === "absent").length;

  if (missing) {
    return (
      <div className="page-stack">
        <PageHeader title="Student not found" description="This child is not in this dugsi." />
        <Link href="/admin/progress" className="btn btn-ghost">Back to Quran progress</Link>
      </div>
    );
  }

  if (!student) return <p>Loading student...</p>;

  return (
    <div className="page-stack">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.class?.name ?? "No class"}${student.class?.teacher?.name ? ` · ${student.class.teacher.name}` : ""}`}
      />
      <div>
        <Link href="/admin/progress" className="btn btn-ghost">Back to Quran progress</Link>
      </div>

      <section className="progress-summary">
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
        <article className="progress-stat is-none">
          <p className="progress-stat-value">{finished.length}</p>
          <p className="progress-stat-label">Juz completed</p>
        </article>
      </section>

      <section className="card" style={{ padding: "1.1rem 1.2rem" }}>
        <p className="record-title">Qur’an</p>
        <p className="record-meta" style={{ marginTop: "0.45rem" }}>
          {latest ? quranPortion(latest) || latest.surah : "No Quran record yet"}
        </p>
        {latest ? <div style={{ marginTop: "0.7rem" }}><StatusBadge status={normalizeProgressStatus(latest.status)} /></div> : <div style={{ marginTop: "0.7rem" }}><StatusBadge status="no_record" /></div>}
        {student.parent?.name ? <p className="record-meta" style={{ marginTop: "0.8rem" }}>Parent: {student.parent.name}</p> : null}
      </section>
    </div>
  );
}

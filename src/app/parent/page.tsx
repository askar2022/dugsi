"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ClipboardList, Receipt } from "lucide-react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { childName, type ParentChild } from "@/lib/parent-family";
import type { Session } from "@/lib/types";

type Homework = {
  id: string;
  title: string;
  dueDate: string | null;
  studentId?: string | null;
  class: { id?: string; name: string } | { id?: string; name: string }[] | null;
};
type Attendance = {
  id: string;
  date: string;
  status: string;
  studentId?: string;
  student: { id?: string; firstName: string; lastName: string };
};

const ACTIONS = [
  { href: "/parent/attendance", label: "Attendance", text: "See who was present after each class.", icon: CalendarDays },
  { href: "/parent/homework", label: "Homework", text: "Quran homework. Mark Done or Needs help.", icon: ClipboardList },
  { href: "/parent/progress", label: "Child Progress", text: "Green is on track, yellow needs practice, red means contact the school.", icon: BookOpen },
  { href: "/parent/billing", label: "Tuition", text: "Green is paid, yellow is due, red is late.", icon: Receipt },
];

function classOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function childSummary(student: ParentChild, homework: Homework[], attendance: Attendance[]) {
  const classLine = [
    student.status === "waiting_assessment" || student.status === "pending"
      ? "Waiting for assessment"
      : student.class?.name ?? "Waiting for assessment",
    student.class?.level,
    student.class?.dayOfWeek ? `Class this ${student.class.dayOfWeek}` : null,
  ].filter(Boolean).join(" · ");

  const mark = attendance.find((row) => row.studentId === student.id || row.student?.id === student.id);
  if (mark) return `${classLine} · ${mark.status} on ${mark.date}`;

  const classId = student.classId ?? student.class?.id;
  const work = homework.find((item) => {
    const sameClass = !classId || classOf(item)?.id === classId;
    const forChild = !item.studentId || item.studentId === student.id;
    return sameClass && forChild;
  });
  if (work) return `${classLine} · ${work.title}${work.dueDate ? ` due ${work.dueDate}` : ""}`;

  return classLine;
}

export default function ParentHomePage() {
  const router = useRouter();
  const { children, selectChild, ready, reload } = useParentFamily();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [user, setUser] = useState<Session | null>(null);
  const [busy, setBusy] = useState("");
  const [welcomeNote, setWelcomeNote] = useState<string | null>(null);
  const [schoolImageUrl, setSchoolImageUrl] = useState<string | null>(null);

  useEffect(() => {
    api<{ user: Session }>("/api/auth/me").then((data) => setUser(data.user));
    Promise.all([
      api<{ tenant: { name: string; welcomeNote: string | null; schoolImageUrl: string | null } }>("/api/settings"),
      api<{ homework: Homework[] }>("/api/homework"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
    ]).then(([settingData, homeworkData, attendanceData]) => {
      setWelcomeNote(settingData.tenant.welcomeNote);
      setSchoolImageUrl(settingData.tenant.schoolImageUrl);
      setHomework(homeworkData.homework.slice(0, 3));
      setAttendance(attendanceData.attendance.slice(0, 3));
    }).catch(() => undefined);
  }, []);

  const nextClass = children.find((student) => student.class?.dayOfWeek)?.class;
  const updates = [
    welcomeNote
      ? { title: "From your school", text: welcomeNote }
      : null,
    nextClass
      ? {
          title: `Class this ${nextClass.dayOfWeek}`,
          text: [nextClass.name, nextClass.startTime && nextClass.endTime ? `${nextClass.startTime}–${nextClass.endTime}` : null]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    homework[0]
      ? { title: "Homework assigned", text: `${homework[0].title}${homework[0].dueDate ? ` · due ${homework[0].dueDate}` : ""}` }
      : null,
    attendance[0]
      ? { title: "Attendance", text: `${attendance[0].student?.firstName ?? "Your child"} was marked ${attendance[0].status} on ${attendance[0].date}.` }
      : null,
  ].filter(Boolean) as Array<{ title: string; text: string }>;

  return (
    <div className="page-stack">
      <section className="card hero parent-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Parent Portal</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Your children, class, and updates are below.
          </p>
        </div>
        <div className="hero-art">
          <SchoolImage
            src={schoolImageUrl}
            name={user?.tenantName}
            alt={user?.tenantName ?? "School"}
            message={user?.tenantName ?? "Your school"}
          />
        </div>
      </section>

      <section className="card menu-list">
        {!ready ? (
          <div className="child-card">
            <div>
              <p className="menu-row-title">Your children</p>
              <p className="menu-row-meta">Loading your family record.</p>
            </div>
          </div>
        ) : children.length === 0 ? (
          <div className="child-card">
            <span className="child-mark">+</span>
            <div>
              <p className="menu-row-title">No children yet</p>
              <p className="menu-row-meta">Use Online Enrollment to add a child. Attendance will appear after their first class.</p>
            </div>
          </div>
        ) : (
          children.map((student) => (
            <div key={student.id} className="child-card">
              <button
                type="button"
                className="child-card-btn"
                style={{ display: "flex", alignItems: "center", gap: "0.9rem", flex: 1, padding: 0 }}
                onClick={() => {
                  selectChild(student.id);
                  router.push("/parent/progress");
                }}
              >
                <span className="child-mark">{student.firstName.charAt(0)}</span>
                <div>
                  <p className="menu-row-title">{childName(student)}</p>
                  <p className="menu-row-meta">
                    {student.status === "unenrolled"
                      ? "Unenrolled"
                      : childSummary(student, homework, attendance)}
                  </p>
                </div>
              </button>
              {student.status === "unenrolled" ? (
                <StatusBadge status="unenrolled" />
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost py-2 text-sm"
                  disabled={busy === student.id}
                  onClick={async (event) => {
                    event.stopPropagation();
                    const ok = window.confirm(`Unenroll ${childName(student)} from this dugsi? The school keeps the record.`);
                    if (!ok) return;
                    setBusy(student.id);
                    try {
                      await api(`/api/students/${student.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ action: "unenroll" }),
                      });
                      await reload();
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === student.id ? "Unenrolling..." : "Unenroll"}
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <section className="card menu-list">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="menu-row">
              <span className="menu-icon">
                <Icon size={18} />
              </span>
              <div className="menu-row-copy">
                <p className="menu-row-title">{item.label}</p>
                <p className="menu-row-meta">{item.text}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="card menu-list">
        <div className="child-card">
          <div>
            <h2 className="page-title" style={{ fontSize: "1.4rem" }}>Updates</h2>
            <p className="page-copy">Class news, homework, and attendance.</p>
          </div>
        </div>
        {updates.length === 0 ? (
          <div className="menu-row">
            <div className="menu-row-copy">
              <p className="menu-row-meta">
                {children.length === 0
                  ? "Updates will appear after you add a child and they attend a class."
                  : "Attendance and homework will appear here after the next class."}
              </p>
            </div>
          </div>
        ) : (
          updates.map((item) => (
            <div key={item.title} className="menu-row">
              <span className="menu-icon">
                <CalendarDays size={18} />
              </span>
              <div className="menu-row-copy">
                <p className="menu-row-title">{item.title}</p>
                <p className="menu-row-meta">{item.text}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

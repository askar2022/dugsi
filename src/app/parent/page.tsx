"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ClipboardList, MessageSquare, Receipt, UserPlus } from "lucide-react";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { api } from "@/lib/api";
import { childName } from "@/lib/parent-family";
import type { Session } from "@/lib/types";

type Homework = { id: string; title: string; dueDate: string | null; class: { name: string } };
type Attendance = { id: string; date: string; status: string; student: { firstName: string; lastName: string } };

const LINKS = [
  { href: "/parent/enroll", label: "Online Enrollment", text: "Add another child to your family record.", icon: UserPlus },
  { href: "/parent#welcome", label: "Welcome note", text: "A short message from your school.", icon: MessageSquare },
  { href: "/parent/attendance", label: "Attendance", text: "See who was present after each class.", icon: CalendarDays },
  { href: "/parent/homework", label: "Homework", text: "Work assigned to your child's class.", icon: ClipboardList },
  { href: "/parent/progress", label: "Child Progress", text: "Surah, Ayah, Juz, and level.", icon: BookOpen },
  { href: "/parent/billing", label: "Tuition", text: "Green is paid, yellow is due, red is late.", icon: Receipt },
];

export default function ParentHomePage() {
  const router = useRouter();
  const { children, selectChild, ready } = useParentFamily();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [user, setUser] = useState<Session | null>(null);
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
      setHomework(homeworkData.homework.slice(0, 2));
      setAttendance(attendanceData.attendance.slice(0, 1));
    }).catch(() => undefined);
  }, []);

  const nextClass = children.find((student) => student.class?.dayOfWeek)?.class;
  const updates = [
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
      ? { title: "Attendance", text: `${attendance[0].student.firstName} was marked ${attendance[0].status} on ${attendance[0].date}.` }
      : null,
  ].filter(Boolean) as Array<{ title: string; text: string }>;

  return (
    <div className="page-stack">
      <section className="card hero">
        <div className="hero-copy">
          <p className="hero-kicker">Parent Portal</p>
          <h1 className="hero-title">{user?.tenantName ?? "Your school"}</h1>
          <p className="hero-text">
            Assalamu alaikum{user?.name ? `, ${user.name}` : ""}. Here are your children,
            class updates, and a simple way to enroll another child.
          </p>
        </div>
        <div className="hero-art">
          <SchoolImage
            src={schoolImageUrl}
            name={user?.tenantName}
            message="Your children's classes and homework will appear here."
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
            <button
              key={student.id}
              type="button"
              className="child-card child-card-btn"
              onClick={() => {
                selectChild(student.id);
                router.push("/parent/progress");
              }}
            >
              <span className="child-mark">{student.firstName.charAt(0)}</span>
              <div>
                <p className="menu-row-title">{childName(student)}</p>
                <p className="menu-row-meta">
                  {student.class?.name ?? "Class pending"}
                  {student.class?.level ? ` · ${student.class.level}` : ""}
                  {student.class?.dayOfWeek ? ` · ${student.class.dayOfWeek}` : ""}
                  {" · "}
                  {student.status}
                </p>
              </div>
            </button>
          ))
        )}
      </section>

      <section className="card menu-list">
        {LINKS.map((item) => {
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

      <section id="welcome" className="card" style={{ padding: "1.35rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.4rem" }}>Welcome note</h2>
        <p className="page-copy">{welcomeNote || "The school has not added a welcome note yet."}</p>
      </section>

      <section className="card menu-list">
        <div className="child-card">
          <div>
            <h2 className="page-title" style={{ fontSize: "1.4rem" }}>Recent updates</h2>
            <p className="page-copy">What is happening in your child's class.</p>
          </div>
        </div>
        {updates.length === 0 ? (
          <div className="menu-row">
            <div className="menu-row-copy">
              <p className="menu-row-meta">No updates yet. Attendance and homework will appear here.</p>
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

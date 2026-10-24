"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { api } from "@/lib/api";
import { formatClassDays } from "@/lib/class-schedule";

type Homework = {
  id: string;
  title: string;
  dueDate: string | null;
};

type Attendance = {
  id: string;
  date: string;
  status: string;
  student: { firstName: string };
};

export default function ParentHomePage() {
  const { children } = useParentFamily();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [welcomeNote, setWelcomeNote] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ tenant: { welcomeNote: string | null } }>("/api/settings"),
      api<{ homework: Homework[] }>("/api/homework"),
      api<{ attendance: Attendance[] }>("/api/attendance"),
    ]).then(([settingData, homeworkData, attendanceData]) => {
      setWelcomeNote(settingData.tenant.welcomeNote);
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
          title: `Class this ${formatClassDays(nextClass.dayOfWeek) || nextClass.dayOfWeek}`,
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
              <p className="menu-row-meta">Attendance and homework will appear here after the next class.</p>
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

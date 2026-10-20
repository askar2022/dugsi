"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Student = { id: string; firstName: string; lastName: string; class?: { name: string } | null; status: string };
type Settings = { welcomeNote: string | null; name: string };

export default function ParentHomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ students: Student[] }>("/api/students"),
      api<{ tenant: Settings }>("/api/settings"),
    ]).then(([studentData, settingData]) => {
      setStudents(studentData.students);
      setSettings(settingData.tenant);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Welcome</p>
        <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">{settings?.name}</h3>
        <p className="mt-3 text-muted">{settings?.welcomeNote}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {students.map((student) => (
          <div key={student.id} className="card p-5">
            <p className="text-lg font-semibold text-green">{student.firstName} {student.lastName}</p>
            <p className="text-sm text-muted">{student.class?.name ?? "Class pending"} · {student.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

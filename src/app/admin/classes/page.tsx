"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

type SchoolClass = {
  id: string;
  name: string;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  teacher?: { name: string } | null;
  _count: { students: number };
};

type Teacher = { id: string; name: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  async function load() {
    const [classData, staffData] = await Promise.all([
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ teachers: Teacher[] }>("/api/staff"),
    ]);
    setClasses(classData.classes);
    setTeachers(staffData.teachers);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/classes", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    await load();
  }

  return (
    <div className="space-y-6">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Teachers & classes</h3>
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Class name"><input className="input" name="name" required /></FormField>
        <FormField label="Level"><input className="input" name="level" placeholder="Year 2" /></FormField>
        <FormField label="Day"><input className="input" name="dayOfWeek" placeholder="Saturday" /></FormField>
        <FormField label="Teacher">
          <select className="select" name="teacherId">
            <option value="">Unassigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Start"><input className="input" name="startTime" placeholder="09:00" /></FormField>
        <FormField label="End"><input className="input" name="endTime" placeholder="11:00" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Add class</button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((item) => (
          <div key={item.id} className="card p-5">
            <h4 className="text-lg font-semibold text-green">{item.name}</h4>
            <p className="text-sm text-muted">{item.teacher?.name ?? "No teacher"} · {item._count.students} students</p>
            <p className="mt-2 text-sm">{item.dayOfWeek} {item.startTime}-{item.endTime}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

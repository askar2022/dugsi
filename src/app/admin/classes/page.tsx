"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import { CLASS_DAYS, formatClassWhen } from "@/lib/class-schedule";

type SchoolClass = {
  id: string;
  name: string;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  assistantId?: string | null;
  teacher?: { id?: string; name: string } | null;
  _count: { students: number };
};

type Teacher = { id: string; name: string };

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    try {
      await api("/api/classes", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime || undefined,
          endTime: data.endTime || undefined,
          teacherId: data.teacherId || undefined,
          assistantId: data.assistantId || undefined,
        }),
      });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that class.");
    } finally {
      setPending(false);
    }
  }

  function teacherName(id?: string | null) {
    if (!id) return "";
    return teachers.find((item) => item.id === id)?.name ?? "";
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Classes"
        description="Group students by schedule and teacher. Each child’s Qur’an level stays on their assessment and progress record."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Class Name">
          <input className="input" name="name" required placeholder="Saturday Morning Class" />
        </FormField>
        <FormField label="Day">
          <select className="select" name="dayOfWeek" required defaultValue="Saturday">
            {CLASS_DAYS.map((day) => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Start Time">
          <input className="input" name="startTime" type="time" required />
        </FormField>
        <FormField label="End Time">
          <input className="input" name="endTime" type="time" required />
        </FormField>
        <FormField label="Lead Teacher">
          <select className="select" name="teacherId">
            <option value="">Unassigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Teaching Assistant">
          <select className="select" name="assistantId">
            <option value="">None</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        </FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Add Class"}
          </button>
          {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((item) => {
          const assistant = teacherName(item.assistantId);
          return (
            <div key={item.id} className="card p-5">
              <h4 className="text-lg font-semibold text-green">{item.name}</h4>
              {isAssessmentClass(item) ? (
                <>
                  <p className="text-sm text-muted">{item._count.students} waiting for assessment</p>
                  <p className="mt-2 text-sm">Holding place for new students until you place them in a class.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">Teacher: {item.teacher?.name ?? "Unassigned"}</p>
                  {assistant ? <p className="text-sm text-muted">Assistant: {assistant}</p> : null}
                  <p className="mt-2 text-sm">{formatClassWhen(item.dayOfWeek, item.startTime, item.endTime)}</p>
                  <p className="text-sm text-muted">{item._count.students} student{item._count.students === 1 ? "" : "s"}</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

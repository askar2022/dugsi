"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type SchoolClass = { id: string; name: string };
type Homework = { id: string; title: string; dueDate: string | null; class: { name: string } };

export default function HomeworkPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);

  async function load() {
    const [classData, homeworkData] = await Promise.all([
      api<{ classes: SchoolClass[] }>("/api/classes"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]);
    setClasses(classData.classes);
    setHomework(homeworkData.homework);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/homework", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    await load();
  }

  return (
    <div className="page-stack">
      <PageHeader title="Homework" description="Assign work to a class." />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Class">
          <select className="select" name="classId" required>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Title"><input className="input" name="title" required /></FormField>
        <FormField label="Assigned">
          <input className="input" name="assignedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </FormField>
        <FormField label="Due"><input className="input" name="dueDate" type="date" /></FormField>
        <div className="md:col-span-2">
          <FormField label="Description"><input className="input" name="description" /></FormField>
        </div>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Assign homework</button>
        </div>
      </form>
      <div className="space-y-3">
        {homework.map((item) => (
          <div key={item.id} className="card p-4">
            <p className="font-semibold text-green">{item.title}</p>
            <p className="text-sm text-muted">{item.class.name} · due {item.dueDate ?? "n/a"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

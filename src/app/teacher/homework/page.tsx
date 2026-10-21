"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type SchoolClass = { id: string; name: string };
type Homework = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  class: { name: string } | { name: string }[] | null;
};

function classNameOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

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
      <PageHeader title="Homework" description="Assign work to your class." />
      {classes.length === 0 ? (
        <EmptyState
          title="No assigned class"
          text="Ask the office to assign you a class before you send homework."
        />
      ) : (
        <form onSubmit={onSubmit} className="card parent-form teacher-form">
          <FormField label="Class">
            <select className="select" name="classId" required defaultValue={classes[0]?.id}>
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
          <FormField label="Description">
            <textarea className="input parent-notes" name="description" rows={3} />
          </FormField>
          <button className="btn btn-primary parent-form-submit">Assign homework</button>
        </form>
      )}
      {homework.length === 0 ? (
        <EmptyState title="No homework yet" text="Assigned work for your class will appear here." />
      ) : (
        <div className="record-list">
          {homework.map((item) => (
            <article key={item.id} className="card record-card-stack">
              <p className="record-title">{item.title}</p>
              <p className="record-meta">
                {classNameOf(item) ?? "Your class"}
                {item.dueDate ? ` · due ${item.dueDate}` : ""}
              </p>
              {item.description ? <p className="record-body">{item.description}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

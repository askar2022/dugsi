"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Homework = { id: string; title: string; description: string | null; dueDate: string | null; class: { name: string } };

export default function ParentHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);

  useEffect(() => {
    api<{ homework: Homework[] }>("/api/homework").then((data) => setHomework(data.homework));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Work assigned to your child's class." />
      {homework.map((item) => (
        <div key={item.id} className="card p-5">
          <p className="font-semibold text-green">{item.title}</p>
          <p className="text-sm text-muted">{item.class.name} · due {item.dueDate ?? "n/a"}</p>
          <p className="mt-2">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

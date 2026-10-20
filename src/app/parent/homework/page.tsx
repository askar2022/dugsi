"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Homework = { id: string; title: string; description: string | null; dueDate: string | null; class: { name: string } };

export default function ParentHomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);

  useEffect(() => {
    api<{ homework: Homework[] }>("/api/homework").then((data) => setHomework(data.homework));
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Homework</h3>
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

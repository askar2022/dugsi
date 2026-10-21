"use client";

import { useEffect, useState } from "react";
import { ChildSwitcher } from "@/components/portal/ChildSwitcher";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useParentFamily } from "@/components/portal/useParentFamily";
import { api } from "@/lib/api";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  class: { id: string; name: string } | { id: string; name: string }[] | null;
};

function classOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function ParentHomeworkPage() {
  const { children, child, childId, selectChild, ready } = useParentFamily();
  const [homework, setHomework] = useState<Homework[]>([]);

  useEffect(() => {
    api<{ homework: Homework[] }>("/api/homework")
      .then((data) => setHomework(data.homework))
      .catch(() => setHomework([]));
  }, []);

  const classId = child?.classId ?? child?.class?.id ?? null;
  const rows = classId
    ? homework.filter((item) => classOf(item)?.id === classId)
    : [];

  return (
    <div className="page-stack">
      <PageHeader
        title="Homework"
        description={child ? `Work assigned to ${child.firstName}'s class.` : "Work assigned to your child's class."}
      />
      <ChildSwitcher children={children} childId={childId} onSelect={selectChild} />
      {!ready ? (
        <EmptyState title="Loading" text="Loading your family record." />
      ) : children.length === 0 ? (
        <EmptyState
          title="No children yet"
          text="Use Online Enrollment to add a child to your family record."
        />
      ) : !classId ? (
        <EmptyState
          title="No class yet"
          text={`Homework will appear after ${child ? child.firstName : "your child"} is placed in a class.`}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No homework yet"
          text="Homework will appear when the teacher assigns work to your child's class."
        />
      ) : (
        <div className="record-list">
          {rows.map((item) => {
            const klass = classOf(item);
            return (
              <article key={item.id} className="card record-card record-card-stack">
                <p className="record-title">{item.title}</p>
                <p className="record-meta">
                  {klass?.name ?? "Class"}
                  {item.dueDate ? ` · due ${item.dueDate}` : ""}
                </p>
                {item.description ? <p className="record-body">{item.description}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

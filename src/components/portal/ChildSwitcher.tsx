"use client";

import { type ParentChild } from "@/lib/parent-family";

export function ChildSwitcher({
  children,
  childId,
  onSelect,
}: {
  children: ParentChild[];
  childId: string | null;
  onSelect: (id: string) => void;
}) {
  if (children.length <= 1) return null;
  const selected = children.find((child) => child.id === childId) ?? children[0];

  return (
    <div className="child-tabs" role="tablist" aria-label="Your children">
      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          role="tab"
          aria-selected={selected?.id === child.id}
          className={`child-tab${selected?.id === child.id ? " is-on" : ""}`}
          onClick={() => onSelect(child.id)}
        >
          {child.firstName}
        </button>
      ))}
    </div>
  );
}

"use client";

import { childName, type ParentChild } from "@/lib/parent-family";

export function ChildSwitcher({
  children,
  childId,
  onSelect,
}: {
  children: ParentChild[];
  childId: string | null;
  onSelect: (id: string) => void;
}) {
  if (children.length === 0) return null;

  return (
    <div className="child-switcher" role="tablist" aria-label="Choose a child">
      {children.map((child) => {
        const active = child.id === childId;
        return (
          <button
            key={child.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`child-chip${active ? " is-active" : ""}`}
            onClick={() => onSelect(child.id)}
          >
            <span className="child-chip-mark">{child.firstName.charAt(0)}</span>
            <span className="child-chip-copy">
              <span className="child-chip-name">{childName(child)}</span>
              <span className="child-chip-meta">{child.class?.name ?? "Class pending"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

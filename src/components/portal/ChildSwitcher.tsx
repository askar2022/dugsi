"use client";

import { classPlaceLabel } from "@/lib/assessment-class";
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
  const selected = children.find((child) => child.id === childId) ?? children[0] ?? null;
  if (children.length === 0 || !selected) return null;

  return (
    <label className="child-select">
      <span className="child-select-label">Select a child from the dropdown list</span>
      <select
        className="select child-select-dropdown"
        value={selected.id}
        onChange={(event) => onSelect(event.target.value)}
        aria-label="Select a child from the dropdown list"
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {`${childName(child)} — ${classPlaceLabel(child)}`}
          </option>
        ))}
      </select>
    </label>
  );
}

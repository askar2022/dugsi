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
    <div className="child-switcher-wrap">
      {children.length > 1 ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-green">Your children</span>
          <select
            className="select"
            value={childId ?? ""}
            onChange={(event) => onSelect(event.target.value)}
            aria-label="Choose a child"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {childName(child)}
                {child.status === "waiting_assessment" || child.status === "pending"
                  ? " · Waiting for assessment"
                  : child.class?.name ? ` · ${child.class.name}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
                <span className="child-chip-meta">
                  {child.status === "waiting_assessment" || child.status === "pending"
                    ? "Waiting for assessment"
                    : child.class?.name ?? "Waiting for assessment"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

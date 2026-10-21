"use client";

import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const selected = children.find((child) => child.id === childId) ?? children[0] ?? null;

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  if (children.length === 0 || !selected) return null;

  return (
    <div className="child-select" ref={box}>
      <p className="metric-label">Select child</p>
      <button
        type="button"
        className="child-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => children.length > 1 ? !value : false)}
      >
        <span className="child-chip-mark">{selected.firstName.charAt(0)}</span>
        <span className="child-chip-copy">
          <span className="child-chip-name">{childName(selected)}</span>
          <span className="child-chip-meta">{classPlaceLabel(selected)}</span>
        </span>
        {children.length > 1 ? (
          <span className="child-select-caret" aria-hidden="true">{open ? "Close" : "Change"}</span>
        ) : null}
      </button>
      {open && children.length > 1 ? (
        <div className="child-select-menu" role="listbox" aria-label="Your children">
          {children.map((child) => {
            const active = child.id === selected.id;
            return (
              <button
                key={child.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`child-select-option${active ? " is-active" : ""}`}
                onClick={() => {
                  onSelect(child.id);
                  setOpen(false);
                }}
              >
                <span className="child-chip-mark">{child.firstName.charAt(0)}</span>
                <span className="child-chip-copy">
                  <span className="child-chip-name">{childName(child)}</span>
                  <span className="child-chip-meta">{classPlaceLabel(child)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

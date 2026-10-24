"use client";

import { useEffect, useRef } from "react";

export type AttendanceMark = "present" | "absent" | "late" | "excused";

export const ATTENDANCE_MARKS: Array<{ value: AttendanceMark; label: string; icon: string }> = [
  { value: "present", label: "Present", icon: "🟢" },
  { value: "absent", label: "Absent", icon: "🔴" },
  { value: "late", label: "Late", icon: "🟠" },
  { value: "excused", label: "Excused", icon: "🔵" },
];

export function AttendanceStatusSelect({
  value,
  open,
  label,
  onOpen,
  onClose,
  onChange,
}: {
  value: AttendanceMark;
  open: boolean;
  label: string;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: AttendanceMark) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const current = ATTENDANCE_MARKS.find((mark) => mark.value === value) ?? ATTENDANCE_MARKS[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  return (
    <div className="attend-status" ref={root}>
      <button
        type="button"
        className={`attend-status-btn is-${current.value}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
      >
        <span className="attend-status-label">
          <span aria-hidden="true">{current.icon}</span>
          {current.label}
        </span>
        <span className="attend-status-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="attend-status-menu" role="listbox" aria-label={label}>
          {ATTENDANCE_MARKS.map((mark) => (
            <button
              key={mark.value}
              type="button"
              role="option"
              aria-selected={mark.value === value}
              className={`attend-status-option${mark.value === value ? " is-on" : ""}`}
              onClick={() => {
                onChange(mark.value);
                onClose();
              }}
            >
              <span aria-hidden="true">{mark.icon}</span>
              {mark.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

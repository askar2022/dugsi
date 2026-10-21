"use client";

import { useMemo, useState } from "react";

export type PickerStudent = { id: string; firstName: string; lastName: string };

export function StudentPicker({
  students,
  value,
  onChange,
  allowAll = false,
  allValue = "all",
  allLabel = "Whole class",
}: {
  students: PickerStudent[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
  allValue?: string;
  allLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (!needle) return true;
      return `${student.firstName} ${student.lastName}`.toLowerCase().includes(needle);
    });
  }, [query, students]);

  return (
    <div className="student-picker">
      <input
        className="input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a student"
        autoComplete="off"
      />
      <div className="student-picker-list">
        {allowAll ? (
          <button
            type="button"
            className={`student-pick${value === allValue ? " is-active" : ""}`}
            onClick={() => onChange(allValue)}
          >
            {allLabel}
          </button>
        ) : null}
        {rows.map((student) => (
          <button
            key={student.id}
            type="button"
            className={`student-pick${value === student.id ? " is-active" : ""}`}
            onClick={() => onChange(student.id)}
          >
            <span className="student-pick-mark">{student.firstName.charAt(0)}</span>
            {student.firstName} {student.lastName}
          </button>
        ))}
        {rows.length === 0 ? <p className="record-meta">No student matches that name.</p> : null}
      </div>
    </div>
  );
}

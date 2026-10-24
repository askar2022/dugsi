"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { HomeworkForm, type HomeworkClass, type HomeworkPayload, type HomeworkRecord, type HomeworkStudent } from "@/components/portal/HomeworkForm";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_KINDS,
  homeworkTab,
  homeworkTabLabel,
  homeworkTitle,
  homeworkWaitingLine,
  normalizeHomeworkKind,
  type HomeworkTab,
} from "@/lib/homework";

type Completion = {
  studentId: string;
  status: string;
  student: { firstName: string; lastName: string } | { firstName: string; lastName: string }[] | null;
};
type Homework = Omit<HomeworkRecord, "completions"> & {
  title: string;
  assignedDate?: string | null;
  completions?: Completion[];
};

const PAGE_SIZE = 12;
const today = () => new Date().toISOString().slice(0, 10);

function classOf(item: Homework) {
  const value = item.class;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function studentOf(completion: Completion) {
  const value = completion.student;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function studentName(completion: Completion) {
  const student = studentOf(completion);
  return student ? `${student.firstName} ${student.lastName}` : "Student";
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${month}. ${date.getDate()}`;
}

function assigneeLine(item: Homework) {
  const names = (item.completions ?? []).map(studentName);
  if (item.studentId && names[0]) return names[0];
  if (names.length === 1) return names[0];
  return classOf(item)?.name ?? "Class";
}

export default function ViewHomeworkPage() {
  const [classes, setClasses] = useState<HomeworkClass[]>([]);
  const [students, setStudents] = useState<HomeworkStudent[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [tab, setTab] = useState<HomeworkTab>("current");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Homework | null>(null);
  const asOf = today();

  async function load() {
    const [classData, studentData, homeworkData] = await Promise.all([
      api<{ classes: HomeworkClass[] }>("/api/classes"),
      api<{ students: HomeworkStudent[] }>("/api/students"),
      api<{ homework: Homework[] }>("/api/homework"),
    ]);
    setClasses(classData.classes);
    setStudents(studentData.students);
    setHomework(homeworkData.homework);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return homework.filter((item) => {
      if (homeworkTab(item.completions ?? [], item.dueDate, asOf) !== tab) return false;
      if (classFilter && (item.classId || classOf(item)?.id) !== classFilter) return false;
      if (kindFilter && item.kind !== kindFilter) return false;
      if (studentFilter && !(item.completions ?? []).some((row) => row.studentId === studentFilter) && item.studentId !== studentFilter) {
        return false;
      }
      const klass = classOf(item);
      const names = (item.completions ?? []).map(studentName).join(" ");
      const haystack = [item.title, item.surah, item.description, item.kind, klass?.name, names].join(" ").toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [asOf, classFilter, homework, kindFilter, query, studentFilter, tab]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function saveEdit(payload: HomeworkPayload) {
    if (!editing) return;
    await api(`/api/homework/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    setEditing(null);
    await load();
  }

  async function remove(item: Homework) {
    if (!window.confirm("Delete this homework assignment? Parents will no longer see it.")) return;
    await api(`/api/homework/${item.id}`, { method: "DELETE" });
    if (openId === item.id) setOpenId(null);
    if (editing?.id === item.id) setEditing(null);
    await load();
  }

  const actions = (item: Homework, open: boolean) => (
    <div className="homework-mini-actions">
      <button type="button" className="btn btn-ghost" onClick={() => setOpenId(open ? null : item.id)}>
        {open ? "Hide" : "View"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setEditing(item)}>Edit</button>
      <button type="button" className="btn btn-ghost" onClick={() => remove(item)}>Delete</button>
    </div>
  );

  return (
    <div className="page-stack">
      <h1 className="page-title">View Homework</h1>

      {homework.length === 0 ? (
        <div className="page-stack">
          <EmptyState title="No homework yet" text="Assign homework, then it will appear here." />
          <Link href="/teacher/homework/assign" className="btn btn-primary" style={{ justifySelf: "start" }}>Assign Homework</Link>
        </div>
      ) : (
        <>
          <section className="homework-toolbar">
            <input
              className="input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search homework"
            />
          </section>
          <div className="homework-tabs" role="tablist">
            {([
              ["current", "Current"],
              ["completed", "Completed"],
              ["past", "Past Due"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`homework-tab${tab === id ? " is-on" : ""}`}
                onClick={() => { setTab(id); setPage(1); }}
              >
                {label}
              </button>
            ))}
          </div>
          <section className="homework-view-filters">
            <select className="select" value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setPage(1); }}>
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="select" value={studentFilter} onChange={(event) => { setStudentFilter(event.target.value); setPage(1); }}>
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
              ))}
            </select>
            <select className="select" value={kindFilter} onChange={(event) => { setKindFilter(event.target.value); setPage(1); }}>
              <option value="">All types</option>
              {HOMEWORK_KINDS.map((value) => (
                <option key={value} value={value}>{HOMEWORK_KIND_LABELS[value]}</option>
              ))}
            </select>
          </section>

          {visible.length === 0 ? (
            <EmptyState title="No assignments" text="Nothing in this tab matches the search." />
          ) : (
            <>
              <div className="record-list progress-mobile">
                {visible.map((item) => {
                  const state = homeworkTab(item.completions ?? [], item.dueDate, asOf);
                  const open = openId === item.id;
                  return (
                    <article key={item.id} className="homework-mini">
                      <div className="homework-mini-top">
                        <p className="homework-portion" style={{ margin: 0 }}>
                          {homeworkTitle({
                            kind: normalizeHomeworkKind(item.kind),
                            surah: item.surah,
                            ayahFrom: item.ayahFrom,
                            ayahTo: item.ayahTo,
                            fallback: item.title,
                          })}
                        </p>
                        <span className={`homework-state is-${state}`}>{homeworkTabLabel(state)}</span>
                      </div>
                      <p className="record-meta">
                        {assigneeLine(item)}
                        {item.dueDate ? ` · Due ${shortDate(item.dueDate)}` : ""}
                      </p>
                      <p className="record-meta">{homeworkWaitingLine(item.completions ?? [])}</p>
                      {actions(item, open)}
                      {open ? (
                        <div className="homework-status-list">
                          {(item.completions ?? []).map((row) => (
                            <div key={row.studentId} className="homework-status-row">
                              <span>{studentName(row)}</span>
                              <StatusBadge status={row.status} />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="progress-table-wrap progress-desktop">
                <table className="progress-table homework-table">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Assigned to</th>
                      <th>Due</th>
                      <th>Completion</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => {
                      const state = homeworkTab(item.completions ?? [], item.dueDate, asOf);
                      const open = openId === item.id;
                      return (
                        <Fragment key={item.id}>
                          <tr>
                            <td>
                              {homeworkTitle({
                                kind: normalizeHomeworkKind(item.kind),
                                surah: item.surah,
                                ayahFrom: item.ayahFrom,
                                ayahTo: item.ayahTo,
                                fallback: item.title,
                              })}
                            </td>
                            <td>{assigneeLine(item)}</td>
                            <td>{item.dueDate ? shortDate(item.dueDate) : "—"}</td>
                            <td>{homeworkWaitingLine(item.completions ?? [])}</td>
                            <td>
                              <span className={`homework-state is-${state}`}>{homeworkTabLabel(state)}</span>
                            </td>
                            <td>{actions(item, open)}</td>
                          </tr>
                          {open ? (
                            <tr>
                              <td colSpan={6}>
                                <div className="homework-status-list">
                                  {(item.completions ?? []).map((row) => (
                                    <div key={row.studentId} className="homework-status-row">
                                      <span>{studentName(row)}</span>
                                      <StatusBadge status={row.status} />
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {rows.length > PAGE_SIZE ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button className="btn btn-ghost" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <button className="btn btn-ghost" type="button" disabled={currentPage * PAGE_SIZE >= rows.length} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>
          ) : null}
        </>
      )}

      {editing ? (
        <div className="homework-drawer" onClick={() => setEditing(null)}>
          <div className="homework-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="homework-drawer-top">
              <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Edit assignment</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Close</button>
            </div>
            <HomeworkForm
              key={editing.id}
              classes={classes}
              students={students}
              homework={editing}
              submitLabel="Save Assignment"
              onSubmit={saveEdit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

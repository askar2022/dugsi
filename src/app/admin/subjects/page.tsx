"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";
import {
  SUBJECTS,
  assignableKeysForOffered,
  subjectLabel,
  type AssignableSubjectKey,
  type OfferedSubjectKey,
} from "@/lib/subjects";

type Teacher = { id: string; name: string };
type SchoolClass = { id: string; name: string; teacherId: string | null; teacherName: string };
type Assignment = { classId: string; subjectKey: string; teacherId: string | null; teacherName: string | null };

type Report = {
  offered: OfferedSubjectKey[];
  teachers: Teacher[];
  classes: SchoolClass[];
  assignments: Assignment[];
};

export default function AdminSubjectsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [offered, setOffered] = useState<OfferedSubjectKey[]>([]);
  const [classId, setClassId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savingOffered, setSavingOffered] = useState(false);
  const [savingClass, setSavingClass] = useState("");

  async function load() {
    const data = await api<Report>("/api/subjects");
    setReport(data);
    setOffered(data.offered);
    setClassId((current) => current || data.classes[0]?.id || "");
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load subjects."));
  }, []);

  const assignable = useMemo(() => assignableKeysForOffered(offered), [offered]);
  const klass = report?.classes.find((item) => item.id === classId) ?? null;

  function teacherFor(subjectKey: string, id = classId) {
    return report?.assignments.find((item) => item.classId === id && item.subjectKey === subjectKey)?.teacherId ?? "";
  }

  function toggleSubject(key: OfferedSubjectKey) {
    setOffered((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
    setMessage("");
  }

  async function saveOffered() {
    setError("");
    setMessage("");
    setSavingOffered(true);
    try {
      await api("/api/subjects", { method: "PUT", body: JSON.stringify({ subjectKeys: offered }) });
      await load();
      setMessage("Subjects this dugsi offers were saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subjects.");
    } finally {
      setSavingOffered(false);
    }
  }

  async function saveTeacher(subjectKey: AssignableSubjectKey, teacherId: string) {
    if (!classId) return;
    setError("");
    setMessage("");
    setSavingClass(subjectKey);
    try {
      await api("/api/subjects/assignments", {
        method: "PUT",
        body: JSON.stringify({
          classId,
          assignments: [{ subjectKey, teacherId: teacherId || null }],
        }),
      });
      await load();
      setMessage("Teacher assignment saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that teacher.");
    } finally {
      setSavingClass("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Subjects & Teacher Assignments"
        description="Select the subjects this dugsi offers, choose a class, then assign a teacher. Qur’an teachers can be set separately for Taxfiid, Tajwiid, and Tafsiir."
      />

      {error ? <p className="mt-0 text-sm text-late">{error}</p> : null}
      {message ? <p className="record-meta">{message}</p> : null}

      <section className="card subject-panel">
        <h2 className="school-chart-title">1. Subjects this dugsi offers</h2>
        <p className="page-copy">Turn on only what this school teaches. Students in every class can then be given a teacher for those subjects.</p>
        <div className="subject-offer-list">
          {SUBJECTS.map((subject) => {
            const on = offered.includes(subject.key);
            return (
              <button
                key={subject.key}
                type="button"
                className={`subject-offer${on ? " is-on" : ""}`}
                onClick={() => toggleSubject(subject.key)}
              >
                <span className="subject-offer-name">{subject.label}</span>
                <span className="subject-offer-copy">{subject.description}</span>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" type="button" disabled={savingOffered} onClick={saveOffered}>
          {savingOffered ? "Saving..." : "Save subjects"}
        </button>
      </section>

      <section className="card subject-panel">
        <h2 className="school-chart-title">2. Assign teachers by class</h2>
        <p className="page-copy">Choose a class, then pick the teacher for each offered subject.</p>
        {!report?.classes.length ? (
          <p className="page-copy">Add a class first, then come back to assign subject teachers.</p>
        ) : !assignable.length ? (
          <p className="page-copy">Save the subjects this dugsi offers, then assign teachers here.</p>
        ) : (
          <>
            <label className="subject-class-pick">
              <span>Class</span>
              <select className="select" value={classId} onChange={(event) => setClassId(event.target.value)}>
                {report.classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            {klass ? <p className="record-meta">Lead teacher: {klass.teacherName}</p> : null}
            {!report.teachers.length ? (
              <p className="page-copy">Add teachers under Staff before assigning subjects.</p>
            ) : (
              <div className="subject-assign">
                {SUBJECTS.map((subject) => {
                  if (!offered.includes(subject.key)) return null;
                  const parts = "parts" in subject ? subject.parts : null;
                  if (parts || subject.key === "quran") {
                    if (!parts) return null;
                    return (
                      <div key={subject.key} className="subject-quran">
                        <p className="subject-offer-name">{subject.label}</p>
                        <p className="subject-offer-copy">{subject.description}</p>
                        {parts.map((part) => (
                          <label key={part.key} className="subject-assign-row is-part">
                            <span>
                              {part.label}
                              <small>{part.description}</small>
                            </span>
                            <select
                              className="select"
                              value={teacherFor(part.key)}
                              disabled={savingClass === part.key}
                              onChange={(event) => saveTeacher(part.key, event.target.value)}
                            >
                              <option value="">Unassigned</option>
                              {(report.teachers ?? []).map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>
                    );
                  }
                  const key = subject.key;
                  return (
                    <label key={key} className="subject-assign-row">
                      <span>
                        {subject.label}
                        <small>{subject.description}</small>
                      </span>
                      <select
                        className="select"
                        value={teacherFor(key)}
                        disabled={savingClass === key}
                        onChange={(event) => saveTeacher(key, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {(report.teachers ?? []).map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {report?.classes.length ? (
        <section className="card subject-panel">
          <h2 className="school-chart-title">Classes</h2>
          <p className="page-copy">Who teaches each offered subject in each class.</p>
          <div className="subject-class-grid">
            {report.classes.map((item) => (
              <article key={item.id} className={`subject-class-card${item.id === classId ? " is-open" : ""}`}>
                <button type="button" className="subject-class-pick-btn" onClick={() => setClassId(item.id)}>
                  <p className="perf-kicker">{item.teacherName}</p>
                  <h3 className="school-chart-title">{item.name}</h3>
                </button>
                {assignable.length === 0 ? (
                  <p className="record-meta">No subjects selected yet.</p>
                ) : (
                  <ul className="subject-class-list">
                    {assignable.map((key) => {
                      const name = report.assignments.find((row) => row.classId === item.id && row.subjectKey === key)?.teacherName;
                      return (
                        <li key={key}>
                          <span>{subjectLabel(key)}</span>
                          <strong>{name ?? "Unassigned"}</strong>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

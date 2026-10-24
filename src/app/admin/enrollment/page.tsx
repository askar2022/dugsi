"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import {
  ENROLLMENT_STAGE_LABELS,
  ENROLLMENT_STAGES,
  type EnrollmentStage,
} from "@/lib/enrollment-pipeline";
import { SURAHS, surahByName } from "@/lib/quran";

type PipelineRow = {
  id: string;
  studentId: string | null;
  applicationId: string | null;
  firstName: string;
  lastName: string;
  parentName: string;
  submittedAt: string | null;
  assessmentLabel: string;
  readingLevel: string;
  stage: EnrollmentStage;
  status: string;
  recommendedClassId: string;
  classId: string | null;
  className: string | null;
};

type SchoolClass = { id: string; name: string; level?: string | null };

const LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Beginner", "Intermediate", "Advanced"];

function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function childName(row: PipelineRow) {
  return `${row.firstName} ${row.lastName}`;
}

export default function EnrollmentPage() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [enrollUrl, setEnrollUrl] = useState("");
  const [tab, setTab] = useState<EnrollmentStage | "all">("all");
  const [query, setQuery] = useState("");
  const [placeClass, setPlaceClass] = useState<Record<string, string>>({});
  const [assessing, setAssessing] = useState<PipelineRow | null>(null);
  const [level, setLevel] = useState("Level 2");
  const [juz, setJuz] = useState(1);
  const [surah, setSurah] = useState("Al-Fatiha");
  const [ayah, setAyah] = useState(1);
  const [notes, setNotes] = useState("");
  const [recommendedClassId, setRecommendedClassId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");

  const realClasses = classes.filter((item) => !isAssessmentClass(item));

  async function load() {
    const [appData, classData] = await Promise.all([
      api<{ pipeline?: PipelineRow[]; enrollUrl: string }>("/api/applications"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setRows(appData.pipeline ?? []);
    setEnrollUrl(`${window.location.origin}${appData.enrollUrl}`);
    setClasses(classData.classes);
    const firstClass = classData.classes.find((item) => !isAssessmentClass(item))?.id ?? "";
    setPlaceClass((current) => {
      const next = { ...current };
      for (const row of appData.pipeline ?? []) {
        const key = row.studentId ?? row.id;
        if (!next[key]) next[key] = row.recommendedClassId || firstClass;
      }
      return next;
    });
    if (!recommendedClassId) setRecommendedClassId(firstClass);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load enrollment."));
  }, []);

  const counts = useMemo(() => ({
    submitted: rows.filter((row) => row.stage === "submitted").length,
    waiting: rows.filter((row) => row.stage === "waiting").length,
    ready: rows.filter((row) => row.stage === "ready").length,
    enrolled: rows.filter((row) => row.stage === "enrolled").length,
  }), [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== "all" && row.stage !== tab) return false;
      if (!needle) return true;
      return [childName(row), row.parentName, row.assessmentLabel, row.status, row.className]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, rows, tab]);

  async function copyLink() {
    if (!enrollUrl) return;
    await navigator.clipboard.writeText(enrollUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function openAssessment(row: PipelineRow) {
    const matched = surahByName(surah);
    setAssessing(row);
    setLevel(row.readingLevel || "Level 2");
    setJuz(1);
    setSurah("Al-Fatiha");
    setAyah(1);
    setNotes("");
    setRecommendedClassId(row.recommendedClassId || realClasses[0]?.id || "");
    setError("");
    void matched;
  }

  async function startAssessment(row: PipelineRow) {
    if (!row.applicationId && !row.studentId) return;
    if (row.studentId) {
      openAssessment(row);
      return;
    }
    setBusy(`${row.id}-start`);
    setError("");
    try {
      const data = await api<{ studentId: string }>(`/api/applications/${row.applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "start" }),
      });
      await load();
      openAssessment({ ...row, studentId: data.studentId, stage: "waiting" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that assessment.");
    } finally {
      setBusy("");
    }
  }

  async function saveAssessment(event: FormEvent) {
    event.preventDefault();
    if (!assessing?.studentId) {
      setError("Start the assessment from the application first.");
      return;
    }
    setBusy("assess");
    setError("");
    try {
      await api(`/api/students/${assessing.studentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "assess",
          readingLevel: level,
          juz,
          surah,
          ayah,
          notes,
          recommendedClassId,
        }),
      });
      setMessage(`${childName(assessing)} is ready for class.`);
      setAssessing(null);
      setTab("ready");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the assessment.");
    } finally {
      setBusy("");
    }
  }

  async function place(row: PipelineRow) {
    const studentId = row.studentId;
    const classId = placeClass[studentId ?? row.id];
    if (!studentId || !classId) {
      setError("Choose a class, then assign the child.");
      return;
    }
    setBusy(`${studentId}-place`);
    setError("");
    try {
      await api(`/api/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "place", classId }),
      });
      const className = realClasses.find((item) => item.id === classId)?.name ?? "class";
      setMessage(`${childName(row)} is enrolled in ${className}.`);
      setTab("enrolled");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign that class.");
    } finally {
      setBusy("");
    }
  }

  const surahRecord = surahByName(surah);

  return (
    <div className="page-stack">
      <PageHeader
        title="Enrollment"
        description="Application, assessment, class assignment, then enrolled."
      />

      <section className="card enroll-link">
        <div>
          <p className="metric-label">Family Enrollment Link</p>
          <p className="record-meta" style={{ marginTop: "0.35rem", wordBreak: "break-all" }}>{enrollUrl || "Loading link…"}</p>
        </div>
        <div className="enroll-link-actions">
          <button type="button" className="btn btn-primary" disabled={!enrollUrl} onClick={copyLink}>
            {copied ? "Link copied" : "Copy Link"}
          </button>
          {enrollUrl ? (
            <a className="btn btn-ghost" href={enrollUrl} target="_blank" rel="noreferrer">
              Open Form
            </a>
          ) : null}
        </div>
      </section>

      <section className="admin-glance">
        {ENROLLMENT_STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            className={`progress-stat teacher-stat-link ${tab === stage ? "is-on" : "is-none"}`}
            onClick={() => setTab(stage)}
          >
            <p className="progress-stat-value">{counts[stage]}</p>
            <p className="progress-stat-label">{ENROLLMENT_STAGE_LABELS[stage]}</p>
          </button>
        ))}
      </section>

      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}

      <section className="card" style={{ padding: "1rem 1.1rem 1.15rem" }}>
        <div className="homework-tabs">
          <button type="button" className={`homework-tab${tab === "all" ? " is-on" : ""}`} onClick={() => setTab("all")}>
            All
          </button>
          {ENROLLMENT_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              className={`homework-tab${tab === stage ? " is-on" : ""}`}
              onClick={() => setTab(stage)}
            >
              {ENROLLMENT_STAGE_LABELS[stage]}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ marginTop: "0.85rem" }}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a student, parent, or status..."
        />

        {visible.length === 0 ? (
          <EmptyState
            title={tab === "waiting" ? "No children waiting" : "No students in this step"}
            text="When a family submits the enrollment form, the child appears here for assessment."
          />
        ) : (
          <div className="table-wrap enroll-table">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Submitted</th>
                  <th>Assessment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const key = row.studentId ?? row.id;
                  return (
                    <tr key={row.id}>
                      <td>{childName(row)}</td>
                      <td>{row.parentName}</td>
                      <td>{shortDate(row.submittedAt)}</td>
                      <td>{row.assessmentLabel}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>
                        {row.stage === "enrolled" && row.studentId ? (
                          <Link href={`/admin/students/${row.studentId}`} className="btn btn-ghost">View</Link>
                        ) : row.stage === "ready" && row.studentId ? (
                          <div className="enroll-action">
                            <select
                              className="select"
                              value={placeClass[key] ?? ""}
                              onChange={(event) => setPlaceClass((current) => ({ ...current, [key]: event.target.value }))}
                            >
                              <option value="">{realClasses.length ? "Choose class" : "Add a class first"}</option>
                              {realClasses.map((klass) => (
                                <option key={klass.id} value={klass.id}>{klass.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={Boolean(busy) || !placeClass[key]}
                              onClick={() => place(row)}
                            >
                              {busy === `${row.studentId}-place` ? "Saving..." : "Assign Class"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={Boolean(busy)}
                            onClick={() => startAssessment(row)}
                          >
                            {busy === `${row.id}-start` ? "Opening..." : "Complete Assessment"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {assessing ? (
        <div className="homework-drawer" onClick={() => setAssessing(null)}>
          <div className="homework-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="homework-drawer-top">
              <div>
                <h2 className="page-title" style={{ fontSize: "1.45rem" }}>Complete Assessment</h2>
                <p className="page-copy">{childName(assessing)} · {assessing.parentName}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setAssessing(null)}>Close</button>
            </div>
            <form className="homework-drawer-form" onSubmit={saveAssessment}>
              <label>
                <span className="metric-label">Reading level</span>
                <select className="select" value={level} onChange={(event) => setLevel(event.target.value)} required>
                  {LEVELS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="metric-label">Current Juz</span>
                <input className="input" type="number" min={1} max={30} value={juz} onChange={(event) => setJuz(Number(event.target.value))} required />
              </label>
              <label>
                <span className="metric-label">Current Surah</span>
                <select className="select" value={surah} onChange={(event) => setSurah(event.target.value)} required>
                  {SURAHS.map((item) => (
                    <option key={item.number} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="metric-label">Current Ayah</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={surahRecord?.ayahs ?? 1}
                  value={ayah}
                  onChange={(event) => setAyah(Number(event.target.value))}
                  required
                />
              </label>
              <label>
                <span className="metric-label">Teacher notes</span>
                <textarea className="input parent-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
              <label>
                <span className="metric-label">Recommended class</span>
                <select className="select" value={recommendedClassId} onChange={(event) => setRecommendedClassId(event.target.value)} required>
                  <option value="">{realClasses.length ? "Choose a class" : "Add a class on the Classes page first"}</option>
                  {realClasses.map((klass) => (
                    <option key={klass.id} value={klass.id}>{klass.name}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" disabled={busy === "assess" || !recommendedClassId}>
                {busy === "assess" ? "Saving..." : "Save Assessment"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

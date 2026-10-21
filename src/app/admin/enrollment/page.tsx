"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";

type Application = {
  id: string;
  parentName: string;
  firstName: string;
  lastName: string;
  status: string;
};

type WaitingChild = {
  id: string;
  firstName: string;
  lastName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  address: string | null;
  age: number | null;
  className: string | null;
};

type SchoolClass = { id: string; name: string; level?: string | null };

const showDemo = process.env.NEXT_PUBLIC_APP_ENV !== "production";

export default function EnrollmentPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [waiting, setWaiting] = useState<WaitingChild[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [enrollUrl, setEnrollUrl] = useState("");
  const [placeClass, setPlaceClass] = useState<Record<string, string>>({});
  const [newClassName, setNewClassName] = useState("");
  const [newClassDay, setNewClassDay] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");

  const realClasses = classes.filter((item) => !isAssessmentClass(item));

  async function load() {
    const [appData, classData] = await Promise.all([
      api<{ applications: Application[]; waiting?: WaitingChild[]; enrollUrl: string }>("/api/applications"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setApplications(appData.applications);
    setWaiting(appData.waiting ?? []);
    setEnrollUrl(`${window.location.origin}${appData.enrollUrl}`);
    setClasses(classData.classes);
    setPlaceClass((current) => {
      const next = { ...current };
      for (const child of appData.waiting ?? []) {
        if (!next[child.id]) next[child.id] = classData.classes.find((item) => !isAssessmentClass(item))?.id ?? "";
      }
      return next;
    });
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load enrollment."));
  }, []);

  async function copyLink() {
    if (!enrollUrl) return;
    await navigator.clipboard.writeText(enrollUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function place(studentId: string) {
    const classId = placeClass[studentId];
    if (!classId) {
      setError("Add a class first, then place the child.");
      return;
    }
    setBusy(`${studentId}place`);
    setError("");
    try {
      await api(`/api/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "place", classId }),
      });
      const className = realClasses.find((item) => item.id === classId)?.name ?? "class";
      setMessage(`Child placed in ${className}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place that child.");
    } finally {
      setBusy("");
    }
  }

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newClassName.trim()) return;
    setBusy("add-class");
    setError("");
    try {
      await api("/api/classes", {
        method: "POST",
        body: JSON.stringify({ name: newClassName.trim(), dayOfWeek: newClassDay.trim() || undefined }),
      });
      setNewClassName("");
      setNewClassDay("");
      setMessage("Class added. You can place a waiting child in it.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that class.");
    } finally {
      setBusy("");
    }
  }

  const placed = applications.filter((item) => item.status === "enrolled");

  return (
    <div className="page-stack">
      <PageHeader
        title="Enrollment"
        description="New children wait for assessment. Then you place them in the right class."
      />

      <section className="card" style={{ padding: "1.2rem", display: "grid", gap: "0.85rem" }}>
        <p className="metric-label">How this page works</p>
        <ol className="page-copy" style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Copy this school’s page and send it to families.</li>
          <li>When a family submits, the child appears here as Waiting for assessment.</li>
          <li>Add classes, then place each child after the assessment.</li>
          <li>If a parent later needs the Parent Portal, invite them from Parents.</li>
        </ol>
      </section>

      <section className="card" style={{ padding: "1.2rem 1.2rem 1.3rem" }}>
        <p className="metric-label">This school’s page</p>
        <p className="record-title" style={{ marginTop: "0.35rem", wordBreak: "break-all" }}>{enrollUrl || "Loading link…"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <button type="button" className="btn btn-primary" disabled={!enrollUrl} onClick={copyLink}>
            {copied ? "Link copied" : "Copy school page"}
          </button>
          {enrollUrl ? (
            <a className="btn btn-ghost" href={enrollUrl} target="_blank" rel="noreferrer">
              Open this school’s page
            </a>
          ) : null}
        </div>
        {showDemo ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: "0.85rem" }}
            onClick={async () => {
              try {
                await api("/api/demo/fill", { method: "POST" });
                setMessage("Staging sample classroom added.");
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add sample data.");
              }
            }}
          >
            Staging only: fill sample classroom
          </button>
        ) : null}
      </section>

      <section className="card" style={{ padding: "1.2rem", display: "grid", gap: "0.85rem" }}>
        <div className="homework-card-top">
          <p className="metric-label" style={{ margin: 0 }}>Classes</p>
          <Link href="/admin/classes" className="btn btn-ghost">Open Classes</Link>
        </div>
        <p className="page-copy" style={{ margin: 0 }}>
          Add the classes you need. New students wait for assessment until you place them in one of these.
        </p>
        <form onSubmit={addClass} className="teacher-filters" style={{ gridTemplateColumns: "minmax(10rem, 1fr) minmax(8rem, 12rem) auto" }}>
          <input
            className="input"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            placeholder="Class name, such as Saturday Quran"
            required
          />
          <input
            className="input"
            value={newClassDay}
            onChange={(event) => setNewClassDay(event.target.value)}
            placeholder="Day, such as Saturday"
          />
          <button className="btn btn-primary" disabled={busy === "add-class"}>
            {busy === "add-class" ? "Adding..." : "Add class"}
          </button>
        </form>
        {realClasses.length ? (
          <p className="record-meta" style={{ margin: 0 }}>
            {realClasses.map((item) => item.name).join(" · ")}
          </p>
        ) : (
          <p className="record-meta" style={{ margin: 0 }}>No classes yet. Add one above so you can place children.</p>
        )}
      </section>

      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}

      <section>
        <h2 className="page-title" style={{ fontSize: "1.4rem", marginBottom: "0.8rem" }}>Waiting for assessment</h2>
        {waiting.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No children waiting</p>
            <p className="empty-state-text">When a family enrolls, the child stays here until you place them in a class.</p>
          </div>
        ) : (
          <div className="record-list">
            {waiting.map((item) => (
              <article key={item.id} className="card record-card-stack" style={{ padding: "1.1rem" }}>
                <div className="homework-card-top">
                  <p className="record-title" style={{ margin: 0 }}>{item.firstName} {item.lastName}</p>
                  <StatusBadge status="waiting_assessment" />
                </div>
                <p className="record-meta">
                  Guardian: {item.parentName}
                  {item.parentEmail ? ` · ${item.parentEmail}` : ""}
                  {item.parentPhone ? ` · ${item.parentPhone}` : ""}
                  {item.age ? ` · age ${item.age}` : ""}
                </p>
                {item.address ? <p className="record-body">{item.address}</p> : null}
                <div className="teacher-filters" style={{ gridTemplateColumns: "minmax(10rem, 1fr) auto", marginTop: "0.75rem" }}>
                  <select
                    className="select"
                    value={placeClass[item.id] ?? ""}
                    onChange={(event) => setPlaceClass((current) => ({ ...current, [item.id]: event.target.value }))}
                  >
                    <option value="">{realClasses.length ? "Choose a class" : "Add a class first"}</option>
                    {realClasses.map((klass) => (
                      <option key={klass.id} value={klass.id}>{klass.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    disabled={Boolean(busy) || !placeClass[item.id]}
                    onClick={() => place(item.id)}
                  >
                    {busy === `${item.id}place` ? "Placing..." : "Place in class"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {placed.length ? (
        <section className="card table-wrap p-2">
          <table>
            <thead>
              <tr>
                <th>Child</th>
                <th>Guardian</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {placed.map((item) => (
                <tr key={item.id}>
                  <td>{item.firstName} {item.lastName}</td>
                  <td>{item.parentName}</td>
                  <td><StatusBadge status="enrolled" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

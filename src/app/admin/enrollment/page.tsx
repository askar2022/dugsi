"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Application = {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  notes: string | null;
  status: string;
};

type SchoolClass = { id: string; name: string };

const showDemo = process.env.NEXT_PUBLIC_APP_ENV !== "production";


export default function EnrollmentPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [enrollUrl, setEnrollUrl] = useState("");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [appData, classData] = await Promise.all([
      api<{ applications: Application[]; enrollUrl: string }>("/api/applications"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setApplications(appData.applications);
    setEnrollUrl(`${window.location.origin}${appData.enrollUrl}`);
    setClasses(classData.classes);
    setClassId((current) => current || classData.classes[0]?.id || "");
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load applications."));
  }, []);

  async function decide(id: string, action: "enroll" | "decline") {
    setBusy(id + action);
    setError("");
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, classId: classId || undefined }),
      });
      setMessage(action === "enroll"
        ? "Child enrolled. The parent was invited to create their own password."
        : "Application declined.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that application.");
    } finally {
      setBusy("");
    }
  }

  const pending = applications.filter((item) => item.status === "pending");
  const reviewed = applications.filter((item) => item.status !== "pending");

  return (
    <div className="page-stack">
      <PageHeader
        title="Enrollment"
        description="Review applications from your public enrollment link. Attendance and Quran progress stay on Students and Classes."
      />
      <section className="card" style={{ padding: "1.2rem 1.2rem 1.3rem" }}>
        <p className="metric-label">Share this link with families</p>
        <p className="record-title" style={{ marginTop: "0.35rem", wordBreak: "break-all" }}>{enrollUrl || "Loading link…"}</p>
        <p className="page-copy">Parents submit without signing in. Other dugsis are not listed.</p>
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
      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}
      <section className="card" style={{ padding: "1.1rem" }}>
        <FormClass classes={classes} classId={classId} onChange={setClassId} />
      </section>
      <section>
        <h2 className="page-title" style={{ fontSize: "1.4rem", marginBottom: "0.8rem" }}>New applications</h2>
        {pending.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No applications yet</p>
            <p className="empty-state-text">Share the enrollment link. New families will appear here for review.</p>
          </div>
        ) : (
          <div className="record-list">
            {pending.map((item) => (
              <article key={item.id} className="card record-card-stack" style={{ padding: "1.1rem" }}>
                <p className="record-title">{item.firstName} {item.lastName}</p>
                <p className="record-meta">
                  {item.parentName} · {item.parentEmail}
                  {item.parentPhone ? ` · ${item.parentPhone}` : ""}
                  {item.dateOfBirth ? ` · born ${item.dateOfBirth}` : ""}
                </p>
                {item.notes ? <p className="record-body">{item.notes}</p> : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => decide(item.id, "enroll")}>
                    {busy === `${item.id}enroll` ? "Enrolling..." : "Enroll and invite parent"}
                  </button>
                  <button className="btn btn-ghost" disabled={Boolean(busy)} onClick={() => decide(item.id, "decline")}>
                    Decline
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {reviewed.length ? (
        <section className="card table-wrap p-2">
          <table>
            <thead>
              <tr>
                <th>Child</th>
                <th>Parent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((item) => (
                <tr key={item.id}>
                  <td>{item.firstName} {item.lastName}</td>
                  <td>{item.parentName}</td>
                  <td><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function FormClass({
  classes,
  classId,
  onChange,
}: {
  classes: SchoolClass[];
  classId: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-green">Place enrolled children in</span>
      <select className="select" value={classId} onChange={(event) => onChange(event.target.value)}>
        <option value="">No class yet</option>
        {classes.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </label>
  );
}

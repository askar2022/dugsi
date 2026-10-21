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
  address: string | null;
  firstName: string;
  lastName: string;
  age: number | null;
  agreedFeeAndEnroll?: boolean;
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
  const [copied, setCopied] = useState(false);
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

  async function copyLink() {
    if (!enrollUrl) return;
    await navigator.clipboard.writeText(enrollUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function decide(id: string, action: "enroll" | "decline") {
    setBusy(id + action);
    setError("");
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, classId: classId || undefined }),
      });
      setMessage(action === "enroll"
        ? "Child enrolled. The parent does not get a login from this page. Invite them later from Parents if they need the portal."
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
        description="Families apply from a public link. They do not sign in. You only enroll or decline the child here."
      />

      <section className="card" style={{ padding: "1.2rem", display: "grid", gap: "0.85rem" }}>
        <p className="metric-label">How this page works</p>
        <ol className="page-copy" style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Copy this school’s page and send it to families. It is only for this dugsi, not Our Dugsi.</li>
          <li>Families tap Enroll your child on that page. They do not sign in.</li>
          <li>Choose a class, then Enroll or Decline. Enroll adds the child to Students. It does not create a parent password.</li>
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

      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}

      <section className="card" style={{ padding: "1.1rem" }}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-green">If you enroll, place the child in</span>
          <select className="select" value={classId} onChange={(event) => setClassId(event.target.value)}>
            <option value="">No class yet</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h2 className="page-title" style={{ fontSize: "1.4rem", marginBottom: "0.8rem" }}>Applications to review</h2>
        {pending.length === 0 ? (
          <div className="card empty-state">
            <p className="empty-state-title">No applications yet</p>
            <p className="empty-state-text">Send families the enrollment link. When they submit, the child will appear here for Enroll or Decline.</p>
          </div>
        ) : (
          <div className="record-list">
            {pending.map((item) => (
              <article key={item.id} className="card record-card-stack" style={{ padding: "1.1rem" }}>
                <p className="record-title">{item.firstName} {item.lastName}</p>
                <p className="record-meta">
                  Guardian: {item.parentName}
                  {item.parentEmail ? ` · ${item.parentEmail}` : ""}
                  {item.parentPhone ? ` · ${item.parentPhone}` : ""}
                  {item.age ? ` · age ${item.age}` : ""}
                </p>
                {item.address ? <p className="record-body">{item.address}</p> : null}
                {item.agreedFeeAndEnroll ? (
                  <p className="record-body">Parent checked: agrees to the dugsi fee and to enroll this child.</p>
                ) : null}
                {item.notes ? <p className="record-body">{item.notes}</p> : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => decide(item.id, "enroll")}>
                    {busy === `${item.id}enroll` ? "Enrolling..." : "Enroll child"}
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
                <th>Guardian</th>
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

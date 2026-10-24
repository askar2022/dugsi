"use client";

import { useEffect, useMemo, useState } from "react";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Admin = { id: string; name: string; email: string; role: string };
type Tenant = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: string;
  admins?: Admin[];
  _count: { users: number; students: number; classes: number };
};

export default function PlatformPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await api<{ tenants: Tenant[] }>("/api/tenants");
    setTenants(data.tenants);
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(() => tenants.filter((tenant) => tenant.status === "pending"), [tenants]);
  const others = useMemo(() => tenants.filter((tenant) => tenant.status !== "pending"), [tenants]);

  async function setStatus(tenant: Tenant, status: "active" | "suspended") {
    setBusy(tenant.id);
    setError("");
    try {
      await api(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(status === "active" ? `${tenant.name} is approved.` : `${tenant.name} is suspended.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that dugsi.");
    } finally {
      setBusy("");
    }
  }

  function schoolCard(tenant: Tenant) {
    return (
      <div key={tenant.id} className="card p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-gold">{tenant.slug}</p>
        <h4 className="mt-1 text-xl font-semibold text-green">{tenant.name}</h4>
        <p className="text-sm text-muted">{tenant.city ?? "No city"}</p>
        <p className="mt-2"><StatusBadge status={tenant.status} /></p>
        <p className="mt-3 text-sm">
          {tenant._count.users} users · {tenant._count.students} students · {tenant._count.classes} classes
        </p>
        {tenant.admins?.length ? (
          <p className="mt-2 text-sm text-muted">
            Admin: {tenant.admins.map((admin) => admin.name).join(", ")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {tenant.status !== "active" ? (
            <button className="btn btn-primary" type="button" disabled={busy === tenant.id} onClick={() => void setStatus(tenant, "active")}>
              {busy === tenant.id ? "Saving..." : "Approve"}
            </button>
          ) : (
            <button className="btn btn-ghost" type="button" disabled={busy === tenant.id} onClick={() => void setStatus(tenant, "suspended")}>
              {busy === tenant.id ? "Saving..." : "Suspend"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Super admin</h3>
        <p className="page-copy">Approve a new dugsi before that school’s admin can sign in. Each admin and teacher keeps their own username and password.</p>
        {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
      </div>
      {pending.length ? (
        <section className="space-y-4">
          <h4 className="text-xl font-semibold text-green">Waiting for approval</h4>
          <div className="grid gap-4 md:grid-cols-2">{pending.map(schoolCard)}</div>
        </section>
      ) : null}
      <section className="space-y-4">
        <h4 className="text-xl font-semibold text-green">Registered dugsis</h4>
        <div className="grid gap-4 md:grid-cols-2">
          {others.length ? others.map(schoolCard) : <p className="page-copy">No approved dugsis yet.</p>}
        </div>
      </section>
      <ChangePasswordForm />
    </div>
  );
}

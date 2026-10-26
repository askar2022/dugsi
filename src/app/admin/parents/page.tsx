"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

type Parent = {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone: string | null;
  status: string;
  children?: Array<{ id: string; firstName: string; lastName: string }>;
};

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [query, setQuery] = useState("");
  const [resetId, setResetId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ parents: Parent[] }>("/api/parents");
    setParents(data.parents);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return parents.filter((parent) => {
      const children = parent.children?.map((child) => `${child.firstName} ${child.lastName}`).join(" ") ?? "";
      return !needle || `${parent.name} ${parent.username ?? ""} ${parent.email} ${parent.phone ?? ""} ${children}`.toLowerCase().includes(needle);
    });
  }, [parents, query]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/parents", { method: "POST", body: JSON.stringify(data) });
      form.reset();
      setMessage("Parent login saved. This family uses their own username and password.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that parent login.");
    }
  }

  async function saveReset(parent: Parent) {
    setError("");
    try {
      await api(`/api/parents/${parent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetPassword }),
      });
      setResetId("");
      setResetPassword("");
      setMessage(`Password reset for ${parent.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset that password.");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Parents"
        description="Each parent gets their own username and password. Do not share one login across families. One parent can still have more than one child."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Parent name"><input className="input" name="name" required /></FormField>
        <FormField label="Username"><input className="input" name="username" required autoComplete="off" /></FormField>
        <FormField label="Password">
          <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </FormField>
        <FormField label="Email for password reset">
          <input className="input" name="email" type="email" autoComplete="off" />
        </FormField>
        <FormField label="Phone"><input className="input" name="phone" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Save parent login</button>
          {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <input
        className="input max-w-md"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search parent, username, or child"
      />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Guardian</th>
              <th>Username</th>
              <th>Phone</th>
              <th>Children</th>
              <th>Portal</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>No parents yet. Approve an application, or create a login here.</td>
              </tr>
            ) : (
              rows.map((parent) => (
                <tr key={parent.id}>
                  <td>{parent.name}</td>
                  <td>{parent.username ?? parent.email}</td>
                  <td>{parent.phone ?? "—"}</td>
                  <td>
                    {parent.children?.length
                      ? parent.children.map((child) => `${child.firstName} ${child.lastName}`).join(", ")
                      : "—"}
                  </td>
                  <td><StatusBadge status={parent.status} /></td>
                  <td>
                    {resetId === parent.id ? (
                      <span style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input
                          className="input"
                          type="password"
                          minLength={8}
                          placeholder="New password"
                          value={resetPassword}
                          onChange={(event) => setResetPassword(event.target.value)}
                        />
                        <button
                          className="btn btn-primary py-2 text-sm"
                          type="button"
                          disabled={resetPassword.length < 8}
                          onClick={() => void saveReset(parent)}
                        >
                          Save
                        </button>
                      </span>
                    ) : (
                      <button className="btn btn-ghost py-2 text-sm" type="button" onClick={() => { setResetId(parent.id); setResetPassword(""); }}>
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

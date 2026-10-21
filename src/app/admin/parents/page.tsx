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
  phone: string | null;
  status: string;
  children?: Array<{ id: string; firstName: string; lastName: string }>;
};

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [query, setQuery] = useState("");
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
      return !needle || `${parent.name} ${parent.email} ${parent.phone ?? ""} ${children}`.toLowerCase().includes(needle);
    });
  }, [parents, query]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/parents", { method: "POST", body: JSON.stringify(data) });
      form.reset();
      setMessage("Invitation sent. The parent will create their own password.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that invitation.");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Parents"
        description="Invite a guardian after a child is enrolled. They create their own password. One parent can be linked to more than one student."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Parent name"><input className="input" name="name" required /></FormField>
        <FormField label="Email"><input className="input" name="email" type="email" required /></FormField>
        <FormField label="Phone"><input className="input" name="phone" /></FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Send parent portal invitation</button>
          {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <input
        className="input max-w-md"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search parent, email, or child"
      />
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Guardian</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Children</th>
              <th>Portal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No parents yet. Approve an application, or send an invitation here.</td>
              </tr>
            ) : (
              rows.map((parent) => (
                <tr key={parent.id}>
                  <td>{parent.name}</td>
                  <td>{parent.email}</td>
                  <td>{parent.phone ?? "—"}</td>
                  <td>
                    {parent.children?.length
                      ? parent.children.map((child) => `${child.firstName} ${child.lastName}`).join(", ")
                      : "—"}
                  </td>
                  <td><StatusBadge status={parent.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

type Parent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  children?: Array<{ id: string; firstName: string; lastName: string }>;
};

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ parents: Parent[] }>("/api/parents");
    setParents(data.parents);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/parents", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    setMessage("Parent login created for this dugsi.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Parents</h3>
        <p className="text-muted">Parent logins belong to this dugsi. They only see their own children.</p>
      </div>
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Parent name"><input className="input" name="name" required /></FormField>
        <FormField label="Email"><input className="input" name="email" type="email" required /></FormField>
        <FormField label="Phone"><input className="input" name="phone" /></FormField>
        <FormField label="Password">
          <input className="input" name="password" type="password" minLength={8} placeholder="Dugsi123!" />
        </FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Add parent</button>
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Children</th>
            </tr>
          </thead>
          <tbody>
            {parents.length === 0 ? (
              <tr>
                <td colSpan={3}>No parents yet. Add a parent, or register a student with a parent email.</td>
              </tr>
            ) : (
              parents.map((parent) => (
                <tr key={parent.id}>
                  <td>{parent.name}</td>
                  <td>{parent.email}</td>
                  <td>
                    {parent.children?.length
                      ? parent.children.map((child) => `${child.firstName} ${child.lastName}`).join(", ")
                      : "—"}
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

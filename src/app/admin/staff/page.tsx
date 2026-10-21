"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Staff = {
  id: string;
  name: string;
  title: string;
  email: string | null;
  salary: number | null;
  userId: string | null;
  user?: { role: string } | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api<{ staff: Staff[] }>("/api/staff");
    setStaff(data.staff);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const createLogin = raw.createLogin === "on";
    if (createLogin && (!raw.email || String(raw.password).length < 8)) {
      setError("To open the Teacher Portal, add an email and a password of at least 8 characters.");
      return;
    }
    await api("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        ...raw,
        salary: raw.salary ? Number(raw.salary) : undefined,
        createLogin,
      }),
    });
    form.reset();
    setMessage(
      createLogin
        ? "Staff saved and a Teacher Portal login was created. They can sign in with that email and password."
        : "Staff record saved. Use Give login if they should open the Teacher Portal.",
    );
    await load();
  }

  async function giveLogin(person: Staff) {
    const password = window.prompt(`Temporary password for ${person.name} (at least 8 characters)`, "Dugsi123!");
    if (!password) return;
    setError("");
    try {
      await api(`/api/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password, role: "TEACHER" }),
      });
      setMessage(`${person.name} can now sign in to the Teacher Portal with ${person.email}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that login.");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Staff"
        description="A staff record is only a name on the list. Check Create a login so they can open the Teacher Portal."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Name"><input className="input" name="name" required /></FormField>
        <FormField label="Title"><input className="input" name="title" placeholder="Teacher" required /></FormField>
        <FormField label="Email"><input className="input" name="email" type="email" /></FormField>
        <FormField label="Phone"><input className="input" name="phone" /></FormField>
        <FormField label="Start date"><input className="input" name="startDate" type="date" /></FormField>
        <FormField label="Salary record"><input className="input" name="salary" type="number" step="0.01" /></FormField>
        <FormField label="Login role">
          <select className="select" name="role" defaultValue="TEACHER">
            <option value="TEACHER">Teacher</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </FormField>
        <FormField label="Temporary password">
          <input className="input" name="password" type="password" placeholder="Dugsi123!" />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-green md:col-span-2">
          <input type="checkbox" name="createLogin" defaultChecked />
          Create a Teacher Portal login
        </label>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Save staff member</button>
          {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Email</th>
              <th>Portal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.title}</td>
                <td>{person.email ?? "—"}</td>
                <td>{person.userId ? person.user?.role ?? "Has login" : "No login yet"}</td>
                <td>
                  {!person.userId && person.email ? (
                    <button className="btn btn-ghost py-1 text-xs" onClick={() => giveLogin(person)}>
                      Give login
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

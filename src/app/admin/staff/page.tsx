"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

type Staff = { id: string; name: string; title: string; email: string | null; salary: number | null };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api<{ staff: Staff[] }>("/api/staff");
    setStaff(data.staff);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    await api("/api/staff", {
      method: "POST",
      body: JSON.stringify({
        ...raw,
        salary: raw.salary ? Number(raw.salary) : undefined,
        createLogin: raw.createLogin === "on",
      }),
    });
    form.reset();
    setMessage("Staff onboarding saved. A welcome email was logged if an address was provided.");
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff" description="Add staff and, if needed, create a login." />
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
          <input className="input" name="password" type="password" />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-green md:col-span-2">
          <input type="checkbox" name="createLogin" />
          Create a login
        </label>
        <div className="md:col-span-2">
          <button className="btn btn-primary">Save staff member</button>
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
              <th>Salary record</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.title}</td>
                <td>{person.email ?? "—"}</td>
                <td>{person.salary ? `$${person.salary}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

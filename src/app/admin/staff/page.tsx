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
  user?: { role: string; status: string } | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

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
    if (createLogin && !raw.email) {
      setError("Add an email so this person can create their own password.");
      return;
    }
    try {
      await api("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          ...raw,
          email: raw.email || undefined,
          startDate: raw.startDate || undefined,
          salary: raw.salary ? Number(raw.salary) : undefined,
          createLogin,
        }),
      });
      form.reset();
      setMessage(
        createLogin
          ? "Invitation sent. They will create their own password from the email."
          : "Staff record saved. Send a login invitation when they should open the portal.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that teacher.");
    }
  }

  async function inviteLogin(person: Staff) {
    setBusy(person.id);
    setError("");
    try {
      await api(`/api/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "TEACHER" }),
      });
      setMessage(`Invitation sent to ${person.email}. They will create their own password.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that invitation.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Staff"
        description="Each teacher uses their own email and sets their own password. Do not reuse another staff member's email."
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
        <label className="flex items-center gap-2 text-sm text-green md:col-span-2">
          <input type="checkbox" name="createLogin" defaultChecked />
          Send a login invitation
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
              <th>Login</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.title}</td>
                <td>{person.email ?? "—"}</td>
                <td>
                  {person.userId ? (
                    person.user?.status === "invited" ? "Invitation sent" : "Ready"
                  ) : person.email ? (
                    <button
                      className="btn btn-primary py-2 text-sm"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => inviteLogin(person)}
                    >
                      {busy === person.id ? "Sending..." : "Send login invitation"}
                    </button>
                  ) : (
                    "Add an email first"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

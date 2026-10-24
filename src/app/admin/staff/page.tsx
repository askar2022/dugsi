"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isAssessmentClass } from "@/lib/assessment-class";
import { api } from "@/lib/api";
import {
  needsAssignedClass,
  portalForPosition,
  portalLabel,
  STAFF_POSITION_GROUPS,
} from "@/lib/staff-positions";

type Staff = {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  status?: string | null;
  userId: string | null;
  user?: { role: string; status: string } | null;
};

type SchoolClass = { id: string; name: string; level?: string | null };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState(false);
  const teaching = needsAssignedClass(position);

  async function load() {
    const [staffData, classData] = await Promise.all([
      api<{ staff: Staff[] }>("/api/staff"),
      api<{ classes: SchoolClass[] }>("/api/classes"),
    ]);
    setStaff(staffData.staff);
    setClasses(classData.classes.filter((item) => !isAssessmentClass(item)));
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setPosition("");
    setClassId("");
    setStatus("active");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (teaching && !classId) {
      setError("Assign a class for that teaching role.");
      return;
    }
    setPending(true);
    try {
      await api("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          email,
          title: position,
          classId: teaching ? classId : undefined,
          status,
        }),
      });
      const portal = portalForPosition(position);
      resetForm();
      setMessage(
        portal && status === "active"
          ? "Staff added. They will get an email to create their own password."
          : "Staff added.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that staff member.");
    } finally {
      setPending(false);
    }
  }

  async function inviteLogin(person: Staff) {
    setBusy(person.id);
    setError("");
    try {
      await api(`/api/staff/${person.id}`, { method: "PATCH", body: JSON.stringify({}) });
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
        description="Add staff by position. The system opens the right portal, or none, from that position."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Full Name">
          <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label="Phone">
          <input className="input" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
        </FormField>
        <FormField label="Email">
          <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        <FormField label="Position">
          <select className="select" required value={position} onChange={(event) => { setPosition(event.target.value); setClassId(""); }}>
            <option value="">Choose a position</option>
            {STAFF_POSITION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.positions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </FormField>
        {teaching ? (
          <FormField label="Assigned Class">
            <select className="select" required value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">{classes.length ? "Choose a class" : "Add a class first"}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
        ) : null}
        <FormField label="Status">
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FormField>
        <div className="md:col-span-2">
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Saving..." : "Add Staff"}
          </button>
          {error ? <p className="mt-3 text-sm text-late">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-paid">{message}</p> : null}
        </div>
      </form>
      <div className="card table-wrap p-2">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Email</th>
              <th>Portal</th>
              <th>Status</th>
              <th>Login</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6}>No staff yet. Add a person above.</td>
              </tr>
            ) : (
              staff.map((person) => {
                const portal = portalForPosition(person.title) ?? person.user?.role ?? null;
                return (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.title}</td>
                    <td>{person.email ?? "—"}</td>
                    <td>{portalLabel(portal)}</td>
                    <td><StatusBadge status={person.status === "inactive" ? "inactive" : "active"} /></td>
                    <td>
                      {person.userId ? (
                        person.user?.status === "invited" ? "Invitation sent" : "Ready"
                      ) : portal && person.email && person.status !== "inactive" ? (
                        <button
                          className="btn btn-primary py-2 text-sm"
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => inviteLogin(person)}
                        >
                          {busy === person.id ? "Sending..." : "Send login invitation"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

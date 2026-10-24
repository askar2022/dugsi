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
  username?: string | null;
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [securityEmail, setSecurityEmail] = useState("");
  const [position, setPosition] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [resetId, setResetId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState(false);
  const teaching = needsAssignedClass(position);
  const portal = portalForPosition(position);

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
    setUsername("");
    setPassword("");
    setSecurityEmail("");
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
          username,
          password: portal ? password : undefined,
          email: portal === "ADMIN" ? securityEmail : undefined,
          title: position,
          classId: teaching ? classId : undefined,
          status,
        }),
      });
      resetForm();
      setMessage(
        portal && status === "active"
          ? "Staff login saved. This person uses their own username and password."
          : "Staff added.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that staff member.");
    } finally {
      setPending(false);
    }
  }

  async function setStaffStatus(person: Staff, next: "active" | "inactive") {
    setBusy(person.id);
    setError("");
    try {
      await api(`/api/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setMessage(next === "active" ? `${person.name} can sign in now.` : `${person.name} is inactive.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that staff member.");
    } finally {
      setBusy("");
    }
  }

  async function saveReset(person: Staff) {
    setBusy(person.id);
    setError("");
    try {
      await api(`/api/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetPassword }),
      });
      setResetId("");
      setResetPassword("");
      setMessage(`Password reset for ${person.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset that password.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Staff"
        description="Each teacher and admin gets their own username and password. Teachers can create an account on the teacher page. Approve them here before they sign in."
      />
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-2">
        <FormField label="Full Name">
          <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label="Phone">
          <input className="input" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
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
        {portal ? (
          <>
            <FormField label="Username">
              <input className="input" required={status === "active"} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Password">
              <input className="input" type="password" required={status === "active"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </FormField>
            {portal === "ADMIN" ? (
              <FormField label="Email for 6-digit code">
                <input className="input" type="email" required={status === "active"} value={securityEmail} onChange={(event) => setSecurityEmail(event.target.value)} />
              </FormField>
            ) : null}
          </>
        ) : null}
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
              <th>Username</th>
              <th>Portal</th>
              <th>Status</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6}>No staff yet. Add a person above.</td>
              </tr>
            ) : (
              staff.map((person) => {
                const personPortal = portalForPosition(person.title) ?? person.user?.role ?? null;
                return (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.title}</td>
                    <td>{person.username ?? person.email ?? "—"}</td>
                    <td>{portalLabel(personPortal)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                        <StatusBadge status={person.status === "inactive" ? "inactive" : "active"} />
                        {person.status === "inactive" ? (
                          <button
                            className="btn btn-primary py-2 text-sm"
                            type="button"
                            disabled={busy === person.id}
                            onClick={() => void setStaffStatus(person, "active")}
                          >
                            {busy === person.id ? "Saving..." : "Approve"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {person.userId ? (
                        resetId === person.id ? (
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
                              disabled={busy === person.id || resetPassword.length < 8}
                              onClick={() => void saveReset(person)}
                            >
                              {busy === person.id ? "Saving..." : "Save"}
                            </button>
                          </span>
                        ) : (
                          <button className="btn btn-ghost py-2 text-sm" type="button" onClick={() => { setResetId(person.id); setResetPassword(""); }}>
                            Reset password
                          </button>
                        )
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

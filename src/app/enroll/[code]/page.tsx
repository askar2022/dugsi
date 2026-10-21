"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

type School = { name: string; city: string | null; code: string };

export default function PublicEnrollPage() {
  const params = useParams<{ code: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!params.code) return;
    api<{ school: School }>(`/api/public/school/${params.code}`)
      .then((data) => setSchool(data.school))
      .catch(() => setMissing(true));
  }, [params.code]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school) return;
    setPending(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/public/enroll", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: school.code,
          parentName: raw.parentName,
          parentEmail: raw.parentEmail,
          parentPhone: raw.parentPhone || undefined,
          firstName: raw.firstName,
          lastName: raw.lastName,
          dateOfBirth: raw.dateOfBirth || undefined,
          gender: raw.gender || undefined,
          notes: raw.notes || undefined,
        }),
      });
      form.reset();
      setMessage("Application sent. The school will review it. You do not need an account yet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that application.");
    } finally {
      setPending(false);
    }
  }

  if (missing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card empty-state max-w-lg">
          <p className="empty-state-title">Enrollment link not found</p>
          <p className="empty-state-text">Ask your school for their enrollment link. This page does not list other dugsis.</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return <p className="px-6 py-10 text-muted">Loading enrollment…</p>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="card parent-form w-full max-w-xl">
        <div>
          <p className="hero-kicker">Online Enrollment</p>
          <h1 className="page-title">{school.name}</h1>
          <p className="page-copy">
            Submit your information and your child’s information. You do not need to sign in.
            {school.city ? ` ${school.city}.` : ""}
          </p>
        </div>
        <h2 className="page-title" style={{ fontSize: "1.3rem" }}>Parent / guardian</h2>
        <FormField label="Your name"><input className="input" name="parentName" required /></FormField>
        <FormField label="Your email"><input className="input" name="parentEmail" type="email" required /></FormField>
        <FormField label="Phone"><input className="input" name="parentPhone" /></FormField>
        <h2 className="page-title" style={{ fontSize: "1.3rem" }}>Child</h2>
        <FormField label="First name"><input className="input" name="firstName" required /></FormField>
        <FormField label="Last name"><input className="input" name="lastName" required /></FormField>
        <FormField label="Date of birth"><input className="input" name="dateOfBirth" type="date" /></FormField>
        <FormField label="Notes"><textarea className="input parent-notes" name="notes" rows={3} /></FormField>
        <button className="btn btn-primary parent-form-submit" disabled={pending}>
          {pending ? "Sending..." : "Submit application"}
        </button>
        {error ? <p className="text-sm text-late">{error}</p> : null}
        {message ? <p className="text-sm text-paid">{message}</p> : null}
      </form>
    </div>
  );
}

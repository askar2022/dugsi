"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

export default function EnrollPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    try {
      await api("/api/enroll", {
        method: "POST",
        body: JSON.stringify({
          firstName: raw.firstName,
          lastName: raw.lastName,
          dateOfBirth: raw.dateOfBirth || undefined,
          notes: raw.notes || undefined,
        }),
      });
      form.reset();
      setMessage("Child saved. Opening your family home…");
      router.push("/parent");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that child.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Online Enrollment"
        description="Type your child's name and save. They will appear on Home right away."
      />
      <form onSubmit={onSubmit} className="card parent-form">
        <FormField label="First name"><input className="input" name="firstName" autoComplete="given-name" required /></FormField>
        <FormField label="Last name"><input className="input" name="lastName" autoComplete="family-name" required /></FormField>
        <FormField label="Date of birth"><input className="input" name="dateOfBirth" type="date" /></FormField>
        <FormField label="Notes"><textarea className="input parent-notes" name="notes" rows={3} placeholder="Allergies, pickup notes, or anything the school should know." /></FormField>
        <button className="btn btn-primary parent-form-submit" disabled={pending}>
          {pending ? "Saving..." : "Save child"}
        </button>
        {error ? <p className="text-sm text-late">{error}</p> : null}
        {message ? <p className="text-sm text-paid">{message}</p> : null}
      </form>
    </div>
  );
}

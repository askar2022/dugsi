"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { api } from "@/lib/api";

export default function EnrollPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/enroll", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    setMessage("Enrollment sent. A confirmation email was sent to the parent account.");
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Online Enrollment"
        description="Add another child to your family record. Use this form on your phone or computer."
      />
      <form onSubmit={onSubmit} className="card parent-form">
        <FormField label="First name"><input className="input" name="firstName" autoComplete="given-name" required /></FormField>
        <FormField label="Last name"><input className="input" name="lastName" autoComplete="family-name" required /></FormField>
        <FormField label="Date of birth"><input className="input" name="dateOfBirth" type="date" /></FormField>
        <FormField label="Notes"><textarea className="input parent-notes" name="notes" rows={3} placeholder="Allergies, pickup notes, or anything the school should know." /></FormField>
        <button className="btn btn-primary parent-form-submit">Submit enrollment</button>
        {message ? <p className="text-sm text-paid">{message}</p> : null}
      </form>
    </div>
  );
}

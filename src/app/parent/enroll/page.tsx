"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export default function EnrollPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    await api("/api/enroll", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    setMessage("Enrollment sent. A confirmation email was logged to the parent account.");
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-xl space-y-4 p-5">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Online enrollment</h3>
      <p className="text-sm text-muted">The child will be added to your family record.</p>
      <FormField label="First name"><input className="input" name="firstName" required /></FormField>
      <FormField label="Last name"><input className="input" name="lastName" required /></FormField>
      <FormField label="Date of birth"><input className="input" name="dateOfBirth" type="date" /></FormField>
      <FormField label="Notes"><input className="input" name="notes" /></FormField>
      <button className="btn btn-primary">Submit enrollment</button>
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

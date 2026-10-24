"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export function ChangePasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (String(data.password) !== String(data.confirm)) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await api("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          password: data.password,
        }),
      });
      form.reset();
      setMessage("Your password was updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
      <div>
        <h2 className="page-title" style={{ fontSize: "1.5rem" }}>Reset your password</h2>
        <p className="page-copy">This login is only for you. Choose a password you have not shared.</p>
      </div>
      <FormField label="Current password">
        <input className="input" name="currentPassword" type="password" required minLength={8} autoComplete="current-password" />
      </FormField>
      <FormField label="New password">
        <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>
      <FormField label="Confirm new password">
        <input className="input" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save new password"}
      </button>
      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

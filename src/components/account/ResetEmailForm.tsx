"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export function ResetEmailForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ email?: string }>("/api/auth/account")
      .then((data) => setEmail(data.email ?? ""))
      .catch(() => setEmail(""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      const data = await api<{ email: string }>("/api/auth/account", {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      setEmail(data.email);
      setMessage("We will send password reset links to this email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
      <div>
        <h2 className="page-title" style={{ fontSize: "1.5rem" }}>Email if you forget your password</h2>
        <p className="page-copy">
          If you forget your password, click Reset password on the parent sign-in page. We email a link here. This is not your username.
        </p>
      </div>
      <FormField label="Email for password reset">
        <input
          className="input"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save email"}
      </button>
      {error ? <p className="text-sm text-late">{error}</p> : null}
      {message ? <p className="text-sm text-paid">{message}</p> : null}
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export function AdminCodeStep({
  sentTo,
  needsEmail,
  onDone,
}: {
  sentTo?: string | null;
  needsEmail?: boolean;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    sentTo ? `We sent a 6-digit code to ${sentTo}.` : "Enter the email where we should send your 6-digit code.",
  );
  const [askEmail, setAskEmail] = useState(Boolean(needsEmail));
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (askEmail) {
        const data = await api<{ sentTo?: string | null }>("/api/auth/login/code", {
          method: "POST",
          body: JSON.stringify({ email: form.get("securityEmail") }),
        });
        setAskEmail(false);
        setMessage(data.sentTo ? `We sent a 6-digit code to ${data.sentTo}.` : "Enter the 6-digit code.");
        return;
      }
      await api("/api/auth/login/code", {
        method: "POST",
        body: JSON.stringify({ code: String(form.get("code") ?? "").replace(/\D/g, "") }),
      });
      onDone();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Could not check that code.";
      setError(text);
      if (/email/i.test(text)) setAskEmail(true);
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError("");
    try {
      const data = await api<{ sentTo?: string | null }>("/api/auth/login/code", {
        method: "POST",
        body: JSON.stringify({ resend: true }),
      });
      setMessage(data.sentTo ? `We sent a new 6-digit code to ${data.sentTo}.` : "A new code was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">{message}</p>
      {askEmail ? (
        <FormField label="Email for the 6-digit code">
          <input className="input" name="securityEmail" type="email" required autoComplete="email" />
        </FormField>
      ) : (
        <FormField label="6-digit code">
          <input
            className="input"
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
          />
        </FormField>
      )}
      {error ? <p className="text-sm text-late">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Checking..." : askEmail ? "Send code" : "Continue"}
      </button>
      {askEmail ? null : (
        <>
          <button className="btn btn-ghost w-full" type="button" disabled={pending} onClick={() => void resend()}>
            Send a new code
          </button>
          <button
            className="btn btn-ghost w-full"
            type="button"
            disabled={pending}
            onClick={() => {
              setAskEmail(true);
              setError("");
              setMessage("Enter a real email you can open. admin@noor.dugsi cannot receive mail.");
            }}
          >
            Send the code to a different email
          </button>
        </>
      )}
    </form>
  );
}

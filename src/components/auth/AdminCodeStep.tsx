"use client";

import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export function AdminCodeStep({
  sentTo,
  notice,
  onDone,
}: {
  sentTo?: string | null;
  notice?: string | null;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    notice ||
      (sentTo
        ? `We sent a 6-digit code to ${sentTo}. Check Inbox and Spam. It is from Dugsi.`
        : "We email the 6-digit code only to the email registered on this office login."),
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/login/code", {
        method: "POST",
        body: JSON.stringify({ code: String(form.get("code") ?? "").replace(/\D/g, "") }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check that code.");
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
      setMessage(
        data.sentTo
          ? `We sent a new 6-digit code to ${data.sentTo}. Check Inbox and Spam. It is from Dugsi.`
          : "A new code was sent to the registered email.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">{message}</p>
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
      {error ? <p className="text-sm text-late">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Checking..." : "Continue"}
      </button>
      <button className="btn btn-ghost w-full" type="button" disabled={pending} onClick={() => void resend()}>
        Send a new code
      </button>
    </form>
  );
}

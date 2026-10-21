"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { portalForRole, type Session } from "@/lib/types";

export default function InvitePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = search.get("code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    async function openInvite() {
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setError("This invitation link is no longer valid. Ask your school to send a new one.");
          return;
        }
        setReady(true);
      } catch {
        setError("This invitation link is no longer valid. Ask your school to send a new one.");
      }
    }

    openInvite();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const supabase = createBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const data = await api<{ user: Session }>("/api/auth/activate", { method: "POST" });
      router.replace(portalForRole(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Portal invitation</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Create your password</h1>
          <p className="mt-2 text-sm text-muted">
            This login is only for your school. Choose a password you have not shared with the office.
          </p>
        </div>
        <FormField label="New password">
          <input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" disabled={!ready} />
        </FormField>
        <FormField label="Confirm password">
          <input className="input" name="confirm" type="password" minLength={8} required autoComplete="new-password" disabled={!ready} />
        </FormField>
        {error ? <p className="text-sm text-late">{error}</p> : null}
        <button className="btn btn-primary w-full" disabled={!ready || pending}>
          {pending ? "Saving..." : "Save password and open portal"}
        </button>
      </form>
    </div>
  );
}

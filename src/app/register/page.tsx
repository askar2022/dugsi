"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ message?: string }>("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          dugsiName: form.get("dugsiName"),
          schoolCode: form.get("schoolCode"),
          adminName: form.get("adminName"),
          username: form.get("username"),
          email: form.get("email") || undefined,
          password: form.get("password"),
          phone: form.get("phone"),
          city: form.get("city"),
        }),
      });
      setDone(data.message || "Your dugsi is waiting for OurDugsi to approve it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register this dugsi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="flex justify-center px-4 pb-16">
      {done ? (
        <div className="card mx-auto w-full max-w-xl space-y-4 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Waiting for approval</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Request received</h1>
          <p className="page-copy">{done}</p>
          <p className="page-copy">The super admin will approve this dugsi. After that, sign in with the admin username and password you chose.</p>
          <Link className="btn btn-primary" href="/login">Back to sign in</Link>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="card mx-auto w-full max-w-xl space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">New school</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Register a dugsi</h1>
          <p className="mt-2 text-sm text-muted">
            Create the school on OurDugsi. A super admin must approve it before the office can sign in. Each admin uses their own username and password.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Dugsi name">
            <input className="input" name="dugsiName" placeholder="Your dugsi name" required />
          </FormField>
          <FormField label="School code">
            <input className="input" name="schoolCode" placeholder="your-school" required />
          </FormField>
          <FormField label="Admin name">
            <input className="input" name="adminName" required />
          </FormField>
          <FormField label="Admin username">
            <input className="input" name="username" required minLength={3} autoComplete="username" />
          </FormField>
          <FormField label="Password">
            <input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" />
          </FormField>
          <FormField label="Email for 6-digit admin code">
            <input className="input" name="email" type="email" required />
          </FormField>
          <FormField label="Phone">
            <input className="input" name="phone" />
          </FormField>
        </div>
        <FormField label="City">
          <input className="input" name="city" />
        </FormField>
        {error ? <p className="text-sm text-late">{error}</p> : null}
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Sending request..." : "Ask to open this school"}
        </button>
        <p className="text-sm text-muted">
          Already approved? <Link className="text-green underline" href="/login">Sign in</Link>
        </p>
      </form>
      )}
      </div>
    </div>
  );
}

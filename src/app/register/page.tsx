"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          dugsiName: form.get("dugsiName"),
          schoolCode: form.get("schoolCode"),
          adminName: form.get("adminName"),
          email: form.get("email"),
          password: form.get("password"),
          phone: form.get("phone"),
          city: form.get("city"),
        }),
      });
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register this dugsi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <form onSubmit={onSubmit} className="card mx-auto w-full max-w-xl space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">New school</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Register a dugsi</h1>
          <p className="mt-2 text-sm text-muted">
            Your school gets its own name, school code, staff, students, and records.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Dugsi name">
            <input className="input" name="dugsiName" placeholder="Masjid Al-Noor Weekend Dugsi" required />
          </FormField>
          <FormField label="School code">
            <input className="input" name="schoolCode" placeholder="noor" required />
          </FormField>
          <FormField label="Admin name">
            <input className="input" name="adminName" required />
          </FormField>
          <FormField label="Admin email">
            <input className="input" name="email" type="email" required />
          </FormField>
          <FormField label="Password">
            <input className="input" name="password" type="password" minLength={8} required />
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
          {pending ? "Creating school..." : "Create school"}
        </button>
        <p className="text-sm text-muted">
          Already registered? <Link className="text-green underline" href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

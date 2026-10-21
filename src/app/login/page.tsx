"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api } from "@/lib/api";
import { portalForRole, type Session } from "@/lib/types";
import { FormField } from "@/components/forms/FormField";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ user: Session }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: form.get("schoolCode"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.replace(params.get("next") || portalForRole(data.user.role));
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} If this is the first time, open Register a dugsi and create the school first.`
          : "Could not sign in.",
      );
    } finally {
      setPending(false);
    }
  }

  async function createDemoSchool() {
    setPending(true);
    setError("");
    try {
      await api("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          dugsiName: "Masjid Al-Noor Weekend Dugsi",
          schoolCode: "noor",
          adminName: "Imam Yusuf",
          email: "admin@noor.dugsi",
          password: "Dugsi123!",
          city: "Minneapolis",
        }),
      });
      await api("/api/demo/sample-families", { method: "POST" }).catch(() => undefined);
      router.replace("/admin/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the demo school.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">School login</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Sign in to Dugsi</h1>
        <p className="mt-2 text-sm text-muted">Sign in with your school code, email, and password.</p>
      </div>
      <FormField label="School code">
        <input className="input" name="schoolCode" placeholder="noor" required />
      </FormField>
      <FormField label="Email">
        <input className="input" name="email" type="email" placeholder="admin@noor.dugsi" required />
      </FormField>
      <FormField label="Password">
        <input className="input" name="password" type="password" required />
      </FormField>
      {error ? <p className="text-sm text-late">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <button
        type="button"
        className="btn btn-ghost w-full"
        disabled={pending}
        onClick={createDemoSchool}
      >
        {pending ? "Creating school..." : "Create the noor demo school"}
      </button>
      <p className="text-sm text-muted">
        New school? <Link className="text-green underline" href="/register">Register a dugsi</Link>
      </p>
      <p className="rounded-2xl bg-green-soft p-3 text-xs text-green">
        Sign-in only works after the school exists. Use <b>Create the noor demo school</b> or
        Register. Then sign in with school code <b>noor</b>, email <b>admin@noor.dugsi</b>,
        password <b>Dugsi123!</b>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

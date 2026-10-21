"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { portalForRole, type Session } from "@/lib/types";
import { FormField } from "@/components/forms/FormField";

const NOOR = {
  schoolCode: "noor",
  password: "Dugsi123!",
  admin: "admin@noor.dugsi",
  teacher: "teacher@noor.dugsi",
  parent: "parent@noor.dugsi",
};

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
          ? `${err.message} For the noor demo, use password Dugsi123! or tap a button below. Do not create another school.`
          : "Could not sign in.",
      );
    } finally {
      setPending(false);
    }
  }

  async function ensureNoorSchool() {
    try {
      await api("/api/tenants/register", {
        method: "POST",
        body: JSON.stringify({
          dugsiName: "Masjid Al-Noor Weekend Dugsi",
          schoolCode: NOOR.schoolCode,
          adminName: "Imam Yusuf",
          email: NOOR.admin,
          password: NOOR.password,
          city: "Minneapolis",
        }),
      });
    } catch (err) {
      const message = err instanceof ApiRequestError || err instanceof Error ? err.message : "";
      if (!/already in use/i.test(message)) throw err;
    }
    await api("/api/demo/fill", { method: "POST" }).catch(() => undefined);
  }

  async function openNoor(role: "ADMIN" | "TEACHER" | "PARENT") {
    setPending(true);
    setError("");
    try {
      await ensureNoorSchool();
      const email = role === "ADMIN" ? NOOR.admin : role === "TEACHER" ? NOOR.teacher : NOOR.parent;
      const data = await api<{ user: Session }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: NOOR.schoolCode,
          email,
          password: NOOR.password,
        }),
      });
      router.replace(portalForRole(data.user.role));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open noor. Use school code noor and password Dugsi123!.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">School login</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Sign in to Dugsi</h1>
        <p className="mt-2 text-sm text-muted">The noor school is already created. Open it below. Do not register a second school.</p>
      </div>
      <FormField label="School code">
        <input className="input" name="schoolCode" defaultValue="noor" required />
      </FormField>
      <FormField label="Email">
        <input className="input" name="email" type="email" defaultValue="admin@noor.dugsi" required />
      </FormField>
      <FormField label="Password">
        <input className="input" name="password" type="password" defaultValue="Dugsi123!" required />
      </FormField>
      {error ? <p className="text-sm text-late">{error}</p> : null}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("ADMIN")}>
        Open noor Management
      </button>
      <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("TEACHER")}>
        Open Teacher Portal
      </button>
      <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("PARENT")}>
        Open Parent Portal
      </button>
      <p className="text-sm text-muted">
        New school? <Link className="text-green underline" href="/register">Register a dugsi</Link>
      </p>
      <p className="rounded-2xl bg-green-soft p-3 text-xs text-green">
        noor already exists. Tap a button. Password is <b>Dugsi123!</b>
        Management: <b>admin@noor.dugsi</b>. Teacher: <b>teacher@noor.dugsi</b>. Parent: <b>parent@noor.dugsi</b>.
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

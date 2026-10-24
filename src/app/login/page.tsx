"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect } from "react";
import { useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";
import { schoolLoginPath } from "@/lib/login-path";
import type { Session } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const schoolCode = (params.get("school") ?? "").trim().toLowerCase();
  const portal = params.get("portal");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (portal === "parent") {
      router.replace(schoolLoginPath("parent", schoolCode || null, params.get("next")));
      return;
    }
    if (portal === "teacher" || portal === "staff") {
      router.replace(schoolLoginPath("teacher", schoolCode || null, params.get("next")));
      return;
    }
    if (portal === "admin" && schoolCode) {
      router.replace(schoolLoginPath("admin", schoolCode, params.get("next")));
      return;
    }
    if (schoolCode && portal !== "admin") {
      router.replace(`/s/${schoolCode}`);
    }
  }, [params, portal, router, schoolCode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api<{ user: Session }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: form.get("schoolCode"),
          email: form.get("email"),
          password: form.get("password"),
          portal: "admin",
        }),
      });
      router.replace(params.get("next") || "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="login-shell">
        <form onSubmit={onSubmit} className="card login-form space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Our Dugsi</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Admin sign in</h1>
            <p className="mt-2 text-sm text-muted">
              For the office that runs a school. Teachers and parents sign in on that school’s own page.
            </p>
          </div>
          <FormField label="School code">
            <input className="input" name="schoolCode" required autoComplete="organization" />
          </FormField>
          <FormField label="Username">
            <input className="input" name="email" type="text" required autoComplete="username" />
          </FormField>
          <FormField label="Password">
            <input className="input" name="password" type="password" required autoComplete="current-password" />
          </FormField>
          {error ? <p className="text-sm text-late">{error}</p> : null}
          {message ? <p className="text-sm text-paid">{message}</p> : null}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="btn btn-ghost w-full"
            type="button"
            disabled={pending}
            onClick={async () => {
              const form = document.querySelector(".login-form") as HTMLFormElement | null;
              const username = String(form?.email instanceof HTMLInputElement ? form.email.value : "").trim();
              const schoolCode = String(form?.schoolCode instanceof HTMLInputElement ? form.schoolCode.value : "").trim();
              if (!schoolCode || username.length < 3) {
                setError("Enter the school code and username first.");
                return;
              }
              setPending(true);
              setError("");
              setMessage("");
              try {
                const data = await api<{ message?: string }>("/api/auth/forgot", {
                  method: "POST",
                  body: JSON.stringify({ schoolCode, username }),
                });
                setMessage(data.message || "If this login can receive email, a reset link was sent.");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not start a password reset.");
              } finally {
                setPending(false);
              }
            }}
          >
            Reset password
          </button>
          <p className="text-sm text-muted">
            New school? <Link className="text-green underline" href="/register">Create</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

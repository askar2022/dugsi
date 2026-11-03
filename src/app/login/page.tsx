"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect } from "react";
import { useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";
import { schoolLoginPath } from "@/lib/login-path";
import { portalForRole, type Session } from "@/lib/types";

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
    if (schoolCode && portal !== "admin" && schoolCode !== "platform") {
      router.replace(`/s/${schoolCode}`);
    }
  }, [params, portal, router, schoolCode]);

  function goNext(user?: Session) {
    const next = params.get("next");
    if (next?.startsWith("/platform") || user?.role === "PLATFORM") {
      router.replace(next?.startsWith("/platform") ? next : "/platform");
      return;
    }
    if (user?.role) {
      router.replace(next || portalForRole(user.role));
      return;
    }
    router.replace(next || "/platform");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ user?: Session }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: "platform",
          email: form.get("email"),
          password: form.get("password"),
          portal: "admin",
        }),
      });
      goNext(data.user);
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
        <div className="card login-form space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">OurDugsi</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Super admin</h1>
            <p className="mt-2 text-sm text-muted">
              Approve a new dugsi here. This is not a school office login. School admins, teachers, and parents sign in on that school’s own page.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
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
                const form = document.querySelector(".login-form form") as HTMLFormElement | null;
                const username = String(form?.elements.namedItem("email") instanceof HTMLInputElement ? (form.elements.namedItem("email") as HTMLInputElement).value : "").trim();
                if (username.length < 3) {
                  setError("Enter your username first.");
                  return;
                }
                setPending(true);
                setError("");
                setMessage("");
                try {
                  const data = await api<{ message?: string }>("/api/auth/forgot", {
                    method: "POST",
                    body: JSON.stringify({ schoolCode: "platform", username }),
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
              New school waiting? Sign in here, then Approve.{" "}
              <Link className="text-green underline" href="/register">Create a dugsi</Link>
            </p>
          </form>
        </div>
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

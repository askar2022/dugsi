"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { SchoolTheme } from "@/components/SchoolTheme";
import { AdminCodeStep } from "@/components/auth/AdminCodeStep";
import { api } from "@/lib/api";
import { portalForRole, type Session } from "@/lib/types";

type School = { name: string; code: string; imageUrl?: string | null; pageColor?: string | null };
type LoginPortal = "parent" | "teacher" | "admin" | "staff";

const COPY = {
  parent: {
    art: "/parent_Image.png",
    artAlt: "Parent",
    kicker: "Welcome",
    heading: "Parent",
    text: "Assalamu alaikum. Sign in with your own username and password.",
  },
  teacher: {
    art: "/teacher_image.png",
    artAlt: "Welcome back, Teacher",
    kicker: "Welcome",
    heading: "Teacher",
    text: "Assalamu alaikum. Sign in with your own username and password.",
  },
  admin: {
    art: "/admin_image.png",
    artAlt: "Welcome back, Admin",
    kicker: "Office",
    heading: "Admin",
    text: "Assalamu alaikum. Sign in with your own password. We will email a 6-digit code.",
  },
  staff: {
    art: "/teacher_image.png",
    artAlt: "Welcome back, Teacher",
    kicker: "Welcome",
    heading: "Teacher",
    text: "Assalamu alaikum. Sign in with your own username and password.",
  },
};

function SchoolLoginForm({
  portal,
  schoolCode: schoolCodeProp,
}: {
  portal: LoginPortal;
  schoolCode?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const schoolCode = (schoolCodeProp ?? params.get("school") ?? "").trim().toLowerCase();
  const copy = COPY[portal];
  const [school, setSchool] = useState<School | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [codeStep, setCodeStep] = useState<{ sentTo?: string | null; needsEmail?: boolean } | null>(
    params.get("code") === "1" && portal === "admin" ? { needsEmail: false } : null,
  );

  function goHome(role?: Session["role"]) {
    const next = params.get("next");
    const home = role ? portalForRole(role) : "/admin";
    const safeNext =
      portal === "parent"
        ? next?.startsWith("/parent")
          ? next
          : home
        : portal === "admin"
          ? next?.startsWith("/admin")
            ? next
            : "/admin"
          : next?.startsWith("/teacher")
            ? next
            : "/teacher";
    router.replace(safeNext);
  }

  useEffect(() => {
    if (!schoolCode) {
      setSchool(null);
      return;
    }
    api<{ school: School }>(`/api/public/school/${schoolCode}`)
      .then((data) => setSchool(data.school))
      .catch(() => setSchool(null));
  }, [schoolCode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ user?: Session; needsCode?: boolean; needsEmail?: boolean; sentTo?: string | null }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: form.get("schoolCode"),
          email: form.get("email"),
          password: form.get("password"),
          portal,
        }),
      });
      if (data.needsCode) {
        setCodeStep({ sentTo: data.sentTo, needsEmail: data.needsEmail });
        return;
      }
      goHome(data.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  async function onForgot() {
    const form = document.querySelector(".login-form") as HTMLFormElement | null;
    const username = String(form?.elements.namedItem("email") instanceof HTMLInputElement ? (form.elements.namedItem("email") as HTMLInputElement).value : "").trim();
    const code = school?.code ?? schoolCode;
    if (!code || username.length < 3) {
      setError("Enter your username first.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{ message?: string }>("/api/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ schoolCode: code, username }),
      });
      setMessage(data.message || "If this login can receive email, a reset link was sent. Otherwise ask the office.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a password reset.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SchoolTheme pageColor={school?.pageColor}>
    <div className="min-h-screen">
      {school || schoolCode ? (
        <PublicHeader
          variant="school"
          schoolName={school?.name ?? schoolCode}
          schoolCode={school?.code ?? schoolCode}
          audience={portal === "parent" ? "parent" : "staff"}
        />
      ) : null}
      <div className="login-shell has-welcome">
        <section className="card login-welcome">
          <img
            className="login-welcome-image"
            src={copy.art}
            alt={copy.artAlt}
          />
        </section>
        <div className="card login-form space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{copy.kicker}</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">{copy.heading}</h1>
            <p className="mt-2 text-sm text-muted">
              {codeStep ? "Enter the 6-digit code we emailed. Teachers and parents do not use this code." : copy.text}
            </p>
          </div>
          {codeStep ? (
            <AdminCodeStep sentTo={codeStep.sentTo} needsEmail={codeStep.needsEmail} onDone={() => goHome("ADMIN")} />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {school || schoolCode ? (
                <input type="hidden" name="schoolCode" value={school?.code ?? schoolCode} />
              ) : (
                <FormField label="School code">
                  <input className="input" name="schoolCode" required autoComplete="organization" />
                </FormField>
              )}
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
              <button className="btn btn-ghost w-full" type="button" disabled={pending} onClick={() => void onForgot()}>
                Reset password
              </button>
              {portal === "parent" ? (
                <p className="login-no-account">
                  Do not have an account?{" "}
                  <Link href={school?.code || schoolCode ? `/enroll/${school?.code ?? schoolCode}` : "/enroll"}>
                    Enroll your child
                  </Link>
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </div>
    </SchoolTheme>
  );
}

export function SchoolLogin({
  portal,
  schoolCode,
}: {
  portal: LoginPortal;
  schoolCode?: string;
}) {
  return (
    <Suspense>
      <SchoolLoginForm portal={portal} schoolCode={schoolCode} />
    </Suspense>
  );
}

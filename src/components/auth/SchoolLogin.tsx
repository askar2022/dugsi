"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";
import { portalForRole, type Session } from "@/lib/types";

type School = { name: string; code: string };

const COPY = {
  parent: {
    art: "/login/parent-portal.jpg",
    artAlt: "Parent portal",
    kicker: "Parents",
    heading: "Parent sign in",
    text: "This page is only for parents at this school.",
  },
  staff: {
    art: "/login/staff-portal.jpg",
    artAlt: "Teacher and staff portal",
    kicker: "Admin & teachers",
    heading: "Staff sign in",
    text: "This page is for the office and teachers.",
  },
};

function SchoolLoginForm({ portal }: { portal: "parent" | "staff" }) {
  const router = useRouter();
  const params = useSearchParams();
  const schoolCode = (params.get("school") ?? "").trim().toLowerCase();
  const copy = COPY[portal];
  const [school, setSchool] = useState<School | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      const data = await api<{ user: Session }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: form.get("schoolCode"),
          email: form.get("email"),
          password: form.get("password"),
          portal,
        }),
      });
      const next = params.get("next");
      const home = portalForRole(data.user.role);
      const safeNext =
        portal === "parent"
          ? next?.startsWith("/parent")
            ? next
            : home
          : next?.startsWith("/admin") || next?.startsWith("/teacher")
            ? next
            : home;
      router.replace(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      {school ? (
        <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} audience={portal} />
      ) : (
        <PublicHeader />
      )}
      <div className="login-shell has-welcome">
        <section className="card login-welcome">
          <img className="login-welcome-image" src={copy.art} alt={copy.artAlt} />
        </section>
        <form onSubmit={onSubmit} className="card login-form space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{school?.name ?? copy.kicker}</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">{copy.heading}</h1>
            <p className="mt-2 text-sm text-muted">{copy.text}</p>
          </div>
          {school ? (
            <input type="hidden" name="schoolCode" value={school.code} />
          ) : (
            <FormField label="School code">
              <input className="input" name="schoolCode" required autoComplete="organization" />
            </FormField>
          )}
          <FormField label="Email">
            <input className="input" name="email" type="email" required autoComplete="username" />
          </FormField>
          <FormField label="Password">
            <input className="input" name="password" type="password" required autoComplete="current-password" />
          </FormField>
          {error ? <p className="text-sm text-late">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
          {portal === "parent" && school ? (
            <p className="text-sm text-muted">
              Enrolling a child?{" "}
              <Link className="text-green underline" href={`/enroll/${school.code}`}>
                Enroll without signing in
              </Link>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

export function SchoolLogin({ portal }: { portal: "parent" | "staff" }) {
  return (
    <Suspense>
      <SchoolLoginForm portal={portal} />
    </Suspense>
  );
}

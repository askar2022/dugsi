"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { portalForRole, type Session } from "@/lib/types";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";

const showDemo = process.env.NEXT_PUBLIC_APP_ENV !== "production";

const NOOR = {
  schoolCode: "noor",
  password: "Dugsi123!",
  admin: "admin@noor.dugsi",
  teacher: "teacher@noor.dugsi",
  parent: "parent@noor.dugsi",
};

type School = { name: string; code: string };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const schoolCode = (params.get("school") ?? "").trim().toLowerCase();
  const portal = params.get("portal");
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
        }),
      });
      router.replace(params.get("next") || portalForRole(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
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
      setError(err instanceof Error ? err.message : "Could not open the staging demo.");
    } finally {
      setPending(false);
    }
  }

  const heading =
    portal === "teacher"
      ? "Teacher sign in"
      : portal === "parent"
        ? "Parent sign in"
        : portal === "admin"
          ? "Admin & staff sign in"
          : "Sign in";

  return (
    <div className="min-h-screen">
      {school ? (
        <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} />
      ) : (
        <PublicHeader />
      )}
      <div className="flex justify-center px-4 pb-16">
        <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{school?.name ?? "Our Dugsi"}</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">{heading}</h1>
            <p className="mt-2 text-sm text-muted">
              {school
                ? "Use your own email and password for this school."
                : "Sign in to the school you already run. Families enroll on that school’s own page."}
            </p>
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
          {showDemo && !school ? (
            <>
              <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("ADMIN")}>
                Staging: open noor Management
              </button>
              <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("TEACHER")}>
                Staging: open Teacher Portal
              </button>
              <button type="button" className="btn btn-ghost w-full" disabled={pending} onClick={() => openNoor("PARENT")}>
                Staging: open Parent Portal
              </button>
            </>
          ) : null}
          {school ? (
            <p className="text-sm text-muted">
              Enrolling a child? <Link className="text-green underline" href={`/enroll/${school.code}`}>Enroll without signing in</Link>
            </p>
          ) : (
            <p className="text-sm text-muted">
              New school? <Link className="text-green underline" href="/register">Create a dugsi</Link>
            </p>
          )}
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

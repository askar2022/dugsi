"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { SchoolTheme } from "@/components/SchoolTheme";
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
    text: "Assalamu alaikum. Sign in to your class.",
  },
  admin: {
    art: "/admin_image.png",
    artAlt: "Welcome back, Admin",
    kicker: "Office",
    heading: "Admin",
    text: "Assalamu alaikum. Sign in to run this school.",
  },
  staff: {
    art: "/teacher_image.png",
    artAlt: "Welcome back, Teacher",
    kicker: "Welcome",
    heading: "Teacher",
    text: "Assalamu alaikum. Sign in to your class.",
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
          : portal === "admin"
            ? next?.startsWith("/admin")
              ? next
              : "/admin"
            : next?.startsWith("/teacher")
              ? next
              : "/teacher";
      router.replace(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
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
        <form onSubmit={onSubmit} className="card login-form space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{copy.kicker}</p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">{copy.heading}</h1>
            <p className="mt-2 text-sm text-muted">{copy.text}</p>
          </div>
          {school || schoolCode ? (
            <input type="hidden" name="schoolCode" value={school?.code ?? schoolCode} />
          ) : (
            <FormField label="School code">
              <input className="input" name="schoolCode" required autoComplete="organization" />
            </FormField>
          )}
          <FormField label={portal === "parent" ? "Username" : "Email"}>
            <input
              className="input"
              name="email"
              type={portal === "parent" ? "text" : "email"}
              required
              autoComplete="username"
            />
          </FormField>
          <FormField label="Password">
            <input className="input" name="password" type="password" required autoComplete="current-password" />
          </FormField>
          {error ? <p className="text-sm text-late">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
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

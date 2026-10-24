"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { RememberSchool } from "@/components/public/RememberSchool";
import { SchoolTheme } from "@/components/SchoolTheme";
import { api } from "@/lib/api";
import { schoolLoginPath } from "@/lib/login-path";

type School = { name: string; code: string; pageColor?: string | null };

export default function TeacherJoinPage() {
  const params = useParams<{ code: string }>();
  const schoolCode = String(params.code ?? "").trim().toLowerCase();
  const [school, setSchool] = useState<School | null>(null);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!schoolCode) return;
    api<{ school: School }>(`/api/public/school/${schoolCode}`)
      .then((data) => setSchool(data.school))
      .catch(() => setMissing(true));
  }, [schoolCode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api<{ message?: string }>("/api/public/teacher", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: school.code,
          name: form.get("name"),
          phone: form.get("phone"),
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      setDone(data.message || "Your teacher account is waiting for the office to approve it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that teacher account.");
    } finally {
      setPending(false);
    }
  }

  if (missing) {
    return (
      <SchoolTheme>
        <div className="min-h-screen">
          <PublicHeader variant="school" schoolName="Dugsi" schoolCode={schoolCode || "school"} homeHref={schoolCode ? `/${schoolCode}/teacher` : "/"} />
          <div className="flex justify-center px-4 pb-16">
            <div className="card empty-state max-w-lg">
              <p className="empty-state-title">School not found</p>
              <p className="empty-state-text">Ask your dugsi for their teacher sign-in page. This form does not list other schools.</p>
            </div>
          </div>
        </div>
      </SchoolTheme>
    );
  }

  if (!school) {
    return (
      <SchoolTheme>
        <div className="min-h-screen">
          <PublicHeader variant="school" schoolName="Dugsi" schoolCode={schoolCode || "school"} homeHref={schoolCode ? `/${schoolCode}/teacher` : "/"} />
          <p className="px-6 py-10 text-muted">Loading…</p>
        </div>
      </SchoolTheme>
    );
  }

  const teacherLogin = schoolLoginPath("teacher", school.code);

  return (
    <SchoolTheme pageColor={school.pageColor}>
      <div className="min-h-screen">
        <RememberSchool code={school.code} />
        <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} audience="staff" homeHref={teacherLogin} />
        <div className="flex justify-center px-4 pb-16">
          <div className="card parent-form w-full max-w-xl">
            {done ? (
              <div className="grid gap-4">
                <p className="hero-kicker">Waiting for the office</p>
                <h1 className="page-title">{school.name}</h1>
                <p className="empty-state-title">Teacher account created</p>
                <p className="page-copy">{done}</p>
                <p className="page-copy">
                  Use the username and password you chose after the office approves you on Staff.
                </p>
                <Link className="btn btn-primary" href={teacherLogin}>Back to teacher sign in</Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-4">
                <div>
                  <p className="hero-kicker">Teacher account</p>
                  <h1 className="page-title">{school.name}</h1>
                  <p className="page-copy">
                    Create your own username and password. The office must approve you before you can sign in. Do not share one login with another teacher.
                  </p>
                </div>
                <FormField label="Full name">
                  <input className="input" name="name" required />
                </FormField>
                <FormField label="Phone">
                  <input className="input" name="phone" type="tel" required />
                </FormField>
                <FormField label="Username">
                  <input className="input" name="username" required minLength={3} autoComplete="username" />
                </FormField>
                <FormField label="Password">
                  <input className="input" name="password" type="password" required minLength={8} autoComplete="new-password" />
                </FormField>
                {error ? <p className="text-sm text-late">{error}</p> : null}
                <button className="btn btn-primary parent-form-submit" disabled={pending}>
                  {pending ? "Saving..." : "Create account"}
                </button>
                <Link className="btn btn-ghost parent-form-submit" href={teacherLogin}>
                  Already have an account? Sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </SchoolTheme>
  );
}

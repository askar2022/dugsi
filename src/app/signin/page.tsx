"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";
import { normalizeSchoolCode } from "@/lib/auth";

export default function SchoolSignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const raw = String(new FormData(event.currentTarget).get("schoolCode") ?? "");
    const code = normalizeSchoolCode(raw);
    if (!code) {
      setPending(false);
      setError("Enter the school code your dugsi gave you.");
      return;
    }
    try {
      await api(`/api/public/school/${code}`);
      router.push(`/s/${code}`);
    } catch {
      setError(
        "That school was not found. Ask your dugsi for their school page. This page does not list other schools.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="flex justify-center px-4 pb-16">
        <form onSubmit={onSubmit} className="card parent-form w-full max-w-xl">
          <div>
            <p className="hero-kicker">School sign in</p>
            <h1 className="page-title">Open your dugsi</h1>
            <p className="page-copy">
              Type your school code. You will open that school’s page. Admin,
              teachers, and parents sign in there. Other schools are not listed.
            </p>
          </div>
          <FormField label="School code">
            <input
              className="input"
              name="schoolCode"
              required
              autoComplete="organization"
              placeholder="your-school"
            />
          </FormField>
          {error ? <p className="text-sm text-late">{error}</p> : null}
          <button className="btn btn-primary parent-form-submit" disabled={pending}>
            {pending ? "Opening..." : "Open school page"}
          </button>
        </form>
      </main>
    </div>
  );
}

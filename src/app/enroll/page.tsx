"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";
import { normalizeSchoolCode } from "@/lib/auth";

export default function EnrollStartPage() {
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
      router.push(`/enroll/${code}`);
    } catch {
      setError("That school was not found. Ask your dugsi for their enrollment link. This page does not list other schools.");
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
            <p className="hero-kicker">School page</p>
            <h1 className="page-title">Open your dugsi</h1>
            <p className="page-copy">
              Families should use the school page their dugsi sent them. If you only have the school code, type it here. Other schools are not listed.
            </p>
          </div>
          <FormField label="School code">
            <input className="input" name="schoolCode" required autoComplete="organization" placeholder="your-school" />
          </FormField>
          {error ? <p className="text-sm text-late">{error}</p> : null}
          <button className="btn btn-primary parent-form-submit" disabled={pending}>
            {pending ? "Opening..." : "Continue to enrollment"}
          </button>
        </form>
      </main>
    </div>
  );
}

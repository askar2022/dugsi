"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { api } from "@/lib/api";

type School = { name: string; city: string | null; code: string };

const emptyParent = {
  firstName: "",
  lastName: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};
const emptyChild = { firstName: "", lastName: "", age: "", notes: "" };

export default function PublicEnrollPage() {
  const params = useParams<{ code: string }>();
  const [school, setSchool] = useState<School | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [parent, setParent] = useState(emptyParent);
  const [child, setChild] = useState(emptyChild);
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!params.code) return;
    api<{ school: School }>(`/api/public/school/${params.code}`)
      .then((data) => setSchool(data.school))
      .catch(() => setMissing(true));
  }, [params.code]);

  function goToChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setStep(2);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api("/api/public/enroll", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: school.code,
          parentName: `${parent.firstName} ${parent.lastName}`.trim(),
          parentEmail: parent.parentEmail,
          parentPhone: parent.parentPhone,
          address: parent.address,
          city: parent.city,
          state: parent.state,
          zip: parent.zip,
          firstName: child.firstName,
          lastName: child.lastName,
          age: child.age ? Number(child.age) : undefined,
          notes: child.notes || undefined,
          agreeFeeAndEnroll: agreed,
        }),
      });
      setParent(emptyParent);
      setChild(emptyChild);
      setAgreed(false);
      setStep(1);
      setMessage("Application sent. The child is waiting for assessment. You do not need an account yet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that application.");
    } finally {
      setPending(false);
    }
  }

  if (missing) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="flex justify-center px-4 pb-16">
          <div className="card empty-state max-w-lg">
            <p className="empty-state-title">School page not found</p>
            <p className="empty-state-text">Ask your dugsi for their school page. This form does not list other schools.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <p className="px-6 py-10 text-muted">Loading enrollment…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} />
      <div className="flex justify-center px-4 pb-16">
        <div className="card parent-form w-full max-w-xl">
          <div>
            <p className="hero-kicker">Enroll your child</p>
            <h1 className="page-title">{school.name}</h1>
            <p className="metric-label" style={{ marginTop: "0.75rem" }}>
              {step === 1 ? "Page 1 of 2 · Parent" : "Page 2 of 2 · Child"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={goToChild} className="grid gap-4">
              <h2 className="page-title" style={{ fontSize: "1.3rem" }}>Parent / guardian</h2>
              <FormField label="First name">
                <input className="input" required value={parent.firstName} onChange={(event) => setParent({ ...parent, firstName: event.target.value })} />
              </FormField>
              <FormField label="Last name">
                <input className="input" required value={parent.lastName} onChange={(event) => setParent({ ...parent, lastName: event.target.value })} />
              </FormField>
              <FormField label="Your email">
                <input className="input" type="email" required value={parent.parentEmail} onChange={(event) => setParent({ ...parent, parentEmail: event.target.value })} />
              </FormField>
              <FormField label="Phone">
                <input className="input" type="tel" required value={parent.parentPhone} onChange={(event) => setParent({ ...parent, parentPhone: event.target.value })} />
              </FormField>
              <FormField label="Address">
                <input className="input" required value={parent.address} onChange={(event) => setParent({ ...parent, address: event.target.value })} />
              </FormField>
              <FormField label="City">
                <input className="input" required value={parent.city} onChange={(event) => setParent({ ...parent, city: event.target.value })} />
              </FormField>
              <FormField label="State">
                <input className="input" required value={parent.state} onChange={(event) => setParent({ ...parent, state: event.target.value })} />
              </FormField>
              <FormField label="Zip code">
                <input className="input" required value={parent.zip} onChange={(event) => setParent({ ...parent, zip: event.target.value })} />
              </FormField>
              <button className="btn btn-primary parent-form-submit" type="submit">
                Next: child information
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <h2 className="page-title" style={{ fontSize: "1.3rem" }}>Child</h2>
              <FormField label="First name">
                <input className="input" required value={child.firstName} onChange={(event) => setChild({ ...child, firstName: event.target.value })} />
              </FormField>
              <FormField label="Last name">
                <input className="input" required value={child.lastName} onChange={(event) => setChild({ ...child, lastName: event.target.value })} />
              </FormField>
              <FormField label="Age">
                <input className="input" type="number" min={3} max={25} required value={child.age} onChange={(event) => setChild({ ...child, age: event.target.value })} />
              </FormField>
              <FormField label="Notes">
                <textarea className="input parent-notes" rows={3} value={child.notes} onChange={(event) => setChild({ ...child, notes: event.target.value })} />
              </FormField>
              <label className="flex items-start gap-3 text-sm text-green">
                <input className="mt-1" type="checkbox" required checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                <span>I agree to this dugsi’s fee and I agree to enroll my child. I will pay at the school. This form does not take a card payment.</span>
              </label>
              <div style={{ display: "grid", gap: "0.6rem" }}>
                <button className="btn btn-primary parent-form-submit" disabled={pending}>
                  {pending ? "Sending..." : "Submit application"}
                </button>
                <button className="btn btn-ghost parent-form-submit" type="button" onClick={() => setStep(1)}>
                  Back to parent
                </button>
              </div>
            </form>
          )}

          {error ? <p className="text-sm text-late">{error}</p> : null}
          {message ? <p className="text-sm text-paid">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

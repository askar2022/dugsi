"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField } from "@/components/forms/FormField";
import { PublicHeader } from "@/components/PublicHeader";
import { RememberSchool } from "@/components/public/RememberSchool";
import { SchoolTheme } from "@/components/SchoolTheme";
import { api } from "@/lib/api";

type School = { name: string; city: string | null; code: string; pageColor?: string | null };
type ParentInfo = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  parentEmail: string;
  parentPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const emptyParent: ParentInfo = {
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};
const emptyChild = { firstName: "", lastName: "", age: "", notes: "" };

type SavedFamily = { parent: ParentInfo; children: string[]; emailed: boolean };

function familyStorageKey(code: string) {
  return `dugsi-enroll-family:${code}`;
}

function parentReady(parent: ParentInfo) {
  return Boolean(
    parent.firstName.trim() &&
      parent.lastName.trim() &&
      parent.username.trim() &&
      parent.password.trim().length >= 8 &&
      parent.parentEmail.includes("@") &&
      parent.parentPhone.trim() &&
      parent.address.trim() &&
      parent.city.trim() &&
      parent.state.trim() &&
      parent.zip.trim(),
  );
}

function readSavedFamily(code: string): SavedFamily | null {
  if (!code) return null;
  try {
    const raw = window.sessionStorage.getItem(familyStorageKey(code));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedFamily>;
      const parent = { ...emptyParent, ...(parsed.parent ?? {}) };
      if (!parent.username && parent.parentEmail) parent.username = parent.parentEmail;
      if (parentReady(parent)) {
        return {
          parent,
          children: Array.isArray(parsed.children) ? parsed.children.filter(Boolean) : [],
          emailed: Boolean(parsed.emailed),
        };
      }
    }
    const legacy = window.sessionStorage.getItem(`dugsi-enroll-parent:${code}`);
    if (!legacy) return null;
    const parent = { ...emptyParent, ...(JSON.parse(legacy) as Partial<ParentInfo>) };
    return parentReady(parent) ? { parent, children: [], emailed: false } : null;
  } catch {
    return null;
  }
}

function writeSavedFamily(code: string, parent: ParentInfo, children: string[], emailed: boolean) {
  if (!code || !parentReady(parent)) return;
  window.sessionStorage.setItem(familyStorageKey(code), JSON.stringify({ parent, children, emailed }));
}

function parentAddress(parent: ParentInfo) {
  return [parent.address, parent.city, parent.state, parent.zip].filter(Boolean).join(", ");
}

export default function PublicEnrollPage() {
  const params = useParams<{ code: string }>();
  const schoolCode = String(params.code ?? "").trim().toLowerCase();
  const [school, setSchool] = useState<School | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [parent, setParent] = useState(emptyParent);
  const [child, setChild] = useState(emptyChild);
  const [agreed, setAgreed] = useState(false);
  const [doneChildren, setDoneChildren] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!params.code) return;
    api<{ school: School }>(`/api/public/school/${params.code}`)
      .then((data) => setSchool(data.school))
      .catch(() => setMissing(true));
  }, [params.code]);

  useEffect(() => {
    if (!school?.code) return;
    const saved = readSavedFamily(school.code);
    if (!saved) return;
    setParent(saved.parent);
    setDoneChildren(saved.children);
    setEmailed(saved.emailed);
    setChild((current) => (current.lastName ? current : { ...current, lastName: saved.parent.lastName }));
    if (saved.children.length && !saved.emailed) setShowDone(true);
    else setStep(2);
  }, [school?.code]);

  function goToChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    writeSavedFamily(school?.code ?? schoolCode, parent, doneChildren, emailed);
    setChild((current) => (current.lastName ? current : { ...current, lastName: parent.lastName }));
    setStep(2);
  }

  function startAnother() {
    setChild({ ...emptyChild, lastName: parent.lastName });
    setAgreed(false);
    setEmailed(false);
    setShowDone(false);
    setError("");
    setStep(parentReady(parent) ? 2 : 1);
  }

  async function finishAll() {
    if (!school) return;
    setPending(true);
    setError("");
    try {
      await api("/api/public/enroll/finish", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: school.code,
          parentEmail: parent.parentEmail || parent.username,
          parentName: `${parent.firstName} ${parent.lastName}`.trim(),
        }),
      });
      setEmailed(true);
      writeSavedFamily(school.code, parent, doneChildren, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the confirmation email.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school) return;
    setPending(true);
    setError("");
    const childName = `${child.firstName} ${child.lastName}`.trim();
    try {
      await api("/api/public/enroll", {
        method: "POST",
        body: JSON.stringify({
          schoolCode: school.code,
          parentName: `${parent.firstName} ${parent.lastName}`.trim(),
          parentUsername: parent.username,
          parentPassword: parent.password,
          parentEmail: parent.parentEmail || parent.username,
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
      const children = doneChildren.includes(childName) ? doneChildren : [...doneChildren, childName];
      writeSavedFamily(school.code, parent, children, false);
      setChild(emptyChild);
      setAgreed(false);
      setDoneChildren(children);
      setShowDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that application.");
    } finally {
      setPending(false);
    }
  }

  if (missing) {
    return (
      <SchoolTheme>
      <div className="min-h-screen">
        <PublicHeader variant="school" schoolName="Dugsi" schoolCode={schoolCode || "school"} homeHref={schoolCode ? `/enroll/${schoolCode}` : "/enroll"} />
        <div className="flex justify-center px-4 pb-16">
          <div className="card empty-state max-w-lg">
            <p className="empty-state-title">Enrollment form not found</p>
            <p className="empty-state-text">Ask your dugsi for their enrollment link. This form does not list other schools.</p>
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
        <PublicHeader variant="school" schoolName="Dugsi" schoolCode={schoolCode || "school"} homeHref={schoolCode ? `/enroll/${schoolCode}` : "/enroll"} />
        <p className="px-6 py-10 text-muted">Loading enrollment…</p>
      </div>
      </SchoolTheme>
    );
  }

  const savedParent = parentReady(parent);

  return (
    <SchoolTheme pageColor={school.pageColor}>
    <div className="min-h-screen">
      <RememberSchool code={school.code} />
      <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} homeHref={`/enroll/${school.code}`} />
      <div className="flex justify-center px-4 pb-16">
        <div className="card parent-form w-full max-w-xl">
          {showDone ? (
            <div className="grid gap-4">
              <div>
                <p className="hero-kicker">{emailed ? "Confirmation emailed" : "Application received"}</p>
                <h1 className="page-title">{school.name}</h1>
              </div>
              <p className="empty-state-title">
                {emailed
                  ? "You can sign in with your username and password. The school will contact you."
                  : `${doneChildren[doneChildren.length - 1]} is waiting for assessment.`}
              </p>
              <p className="page-copy">
                {emailed
                  ? `We emailed ${parent.parentEmail || parent.username} to confirm ${doneChildren.join(", ")} ${doneChildren.length === 1 ? "is" : "are"} enrolled and waiting for assessment.`
                  : "Add every child first. Sign in later with this parent’s own username and password. The school will contact you."}
              </p>
              <p className="record-meta">
                {doneChildren.map((name) => (
                  <span key={name} style={{ display: "block" }}>{name}</span>
                ))}
              </p>
              {emailed ? null : savedParent ? (
                <p className="record-meta">
                  {parent.firstName} {parent.lastName} and this address stay on file. A sibling only needs student information.
                </p>
              ) : null}
              {emailed ? (
                <button className="btn btn-ghost parent-form-submit" type="button" onClick={startAnother}>
                  Enroll another child
                </button>
              ) : (
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  <button className="btn btn-primary parent-form-submit" type="button" disabled={pending} onClick={() => void finishAll()}>
                    {pending ? "Saving..." : "I'm finished"}
                  </button>
                  <button className="btn btn-ghost parent-form-submit" type="button" disabled={pending} onClick={startAnother}>
                    Enroll another child
                  </button>
                </div>
              )}
              {error ? <p className="text-sm text-late">{error}</p> : null}
            </div>
          ) : (
            <>
          <div>
            <p className="hero-kicker">Enroll your child</p>
            <h1 className="page-title">{school.name}</h1>
            <p className="metric-label" style={{ marginTop: "0.75rem" }}>
              {step === 1 ? "Parent details once" : savedParent ? "Student information" : "Page 2 of 2 · Child"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={goToChild} className="grid gap-4">
              <h2 className="page-title" style={{ fontSize: "1.3rem" }}>Parent / guardian</h2>
              <p className="page-copy">Enter this once. Each parent uses their own username and password. We use the email only if this parent forgets the password. Do not share one login with other families.</p>
              <FormField label="First name">
                <input className="input" required value={parent.firstName} onChange={(event) => setParent({ ...parent, firstName: event.target.value })} />
              </FormField>
              <FormField label="Last name">
                <input className="input" required value={parent.lastName} onChange={(event) => setParent({ ...parent, lastName: event.target.value })} />
              </FormField>
              <FormField label="Username">
                <input className="input" required minLength={3} autoComplete="username" value={parent.username} onChange={(event) => setParent({ ...parent, username: event.target.value })} />
              </FormField>
              <FormField label="Password">
                <input className="input" type="password" required minLength={8} autoComplete="new-password" value={parent.password} onChange={(event) => setParent({ ...parent, password: event.target.value })} />
              </FormField>
              <FormField label="Email for password reset">
                <input className="input" type="email" required autoComplete="email" value={parent.parentEmail} onChange={(event) => setParent({ ...parent, parentEmail: event.target.value })} />
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
              {savedParent ? (
                <div>
                  <p className="metric-label">Parent on this application</p>
                  <p className="record-title">{parent.firstName} {parent.lastName}</p>
                  <p className="record-meta">{parent.username} · {parent.parentPhone}</p>
                  <p className="record-meta">{parentAddress(parent)}</p>
                </div>
              ) : null}
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
                  Change parent or address
                </button>
              </div>
            </form>
          )}

          {error ? <p className="text-sm text-late">{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
    </SchoolTheme>
  );
}

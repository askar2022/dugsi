"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { api } from "@/lib/api";

type Tenant = {
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  welcomeNote: string | null;
  schoolImageUrl: string | null;
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [enrollUrl, setEnrollUrl] = useState("");
  const [message, setMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const data = await api<{ tenant: Tenant; enrollUrl: string | null }>("/api/settings");
    setTenant(data.tenant);
    setEnrollUrl(data.enrollUrl ? `${window.location.origin}${data.enrollUrl}` : "");
    setPreview(null);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/settings", { method: "PATCH", body: JSON.stringify(data) });
    setMessage("School settings saved.");
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setImageError("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await api<{ schoolImageUrl: string | null }>("/api/settings/image", {
        method: "POST",
        body,
      });
      setTenant((current) => (current ? { ...current, schoolImageUrl: data.schoolImageUrl } : current));
      setMessage("School image saved for this dugsi only.");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not save the school image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    setImageError("");
    try {
      await api("/api/settings/image", { method: "DELETE" });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setTenant((current) => (current ? { ...current, schoolImageUrl: null } : current));
      setMessage("School image removed.");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not remove the school image.");
    } finally {
      setBusy(false);
    }
  }

  if (!tenant) return <p>Loading settings...</p>;

  return (
    <div className="page-stack">
      <PageHeader title="Settings" description="Your school name, photo, contact details, welcome note, and public enrollment link." />

      {enrollUrl ? (
        <section className="card max-w-2xl space-y-2 p-6">
          <h2 className="page-title" style={{ fontSize: "1.5rem" }}>Public enrollment</h2>
          <p className="page-copy">Share this link with families. They submit without signing in. Other dugsis are not listed.</p>
          <p className="record-title" style={{ wordBreak: "break-all" }}>{enrollUrl}</p>
        </section>
      ) : null}

      <section className="card max-w-2xl space-y-4 p-6">
        <div>
          <h2 className="page-title" style={{ fontSize: "1.5rem" }}>School Profile</h2>
          <p className="page-copy">This photo appears on your welcome screen. Families from other schools cannot see it.</p>
        </div>
        <div className="profile-preview">
          <SchoolImage src={preview ?? tenant.schoolImageUrl} name={tenant.name} alt={`${tenant.name} school photo`} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => onPick(event.target.files?.[0])}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
            {tenant.schoolImageUrl || preview ? "Replace image" : "Upload school image"}
          </button>
          {tenant.schoolImageUrl || preview ? (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onRemove}>
              Remove
            </button>
          ) : null}
        </div>
        {imageError ? <p className="text-sm text-late">{imageError}</p> : null}
      </section>

      <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
        <FormField label="Dugsi name"><input className="input" name="name" defaultValue={tenant.name} /></FormField>
        <FormField label="Phone"><input className="input" name="phone" defaultValue={tenant.phone ?? ""} /></FormField>
        <FormField label="Address"><input className="input" name="address" defaultValue={tenant.address ?? ""} /></FormField>
        <FormField label="City"><input className="input" name="city" defaultValue={tenant.city ?? ""} /></FormField>
        <FormField label="Welcome note">
          <textarea className="input min-h-32" name="welcomeNote" defaultValue={tenant.welcomeNote ?? ""} />
        </FormField>
        <button className="btn btn-primary">Save settings</button>
        {message ? <p className="text-sm text-paid">{message}</p> : null}
      </form>
    </div>
  );
}

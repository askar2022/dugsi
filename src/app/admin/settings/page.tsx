"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/portal/PageHeader";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { api } from "@/lib/api";
import { PAGE_COLOR_IDS, PAGE_COLORS, type PageColorId } from "@/lib/page-color";

type Tenant = {
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  welcomeNote: string | null;
  pageColor?: string | null;
  schoolImageUrl: string | null;
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [pageColor, setPageColor] = useState<PageColorId>("green");
  const [enrollUrl, setEnrollUrl] = useState("");
  const [securityEmail, setSecurityEmail] = useState("");
  const [message, setMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const data = await api<{ tenant: Tenant; enrollUrl: string | null; securityEmail?: string | null }>("/api/settings");
    setTenant(data.tenant);
    setSecurityEmail(data.securityEmail ?? "");
    setPageColor(
      data.tenant.pageColor && PAGE_COLOR_IDS.includes(data.tenant.pageColor as PageColorId)
        ? (data.tenant.pageColor as PageColorId)
        : "green",
    );
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
    await api("/api/settings", { method: "PATCH", body: JSON.stringify({ ...data, pageColor, securityEmail }) });
    window.dispatchEvent(new CustomEvent("dugsi-page-color", { detail: pageColor }));
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
      <PageHeader title="Settings" description="Your school name, photo, page color, contact details, welcome note, and public enrollment link." />

      {enrollUrl ? (
        <section className="card max-w-2xl space-y-2 p-6">
          <h2 className="page-title" style={{ fontSize: "1.5rem" }}>This school’s page</h2>
          <p className="page-copy">Share this link with families. It is this dugsi’s landing page, not Our Dugsi. Each parent creates their own username and password.</p>
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
        <FormField label="Email for your 6-digit admin code">
          <input className="input" type="email" value={securityEmail} onChange={(event) => setSecurityEmail(event.target.value)} />
        </FormField>
        <FormField label="Welcome note">
          <textarea className="input min-h-32" name="welcomeNote" defaultValue={tenant.welcomeNote ?? ""} />
        </FormField>
        <div>
          <p className="text-sm font-medium text-green">Page color</p>
          <p className="page-copy">This color is used on this dugsi’s pages. Green is the same as Noor.</p>
          <div className="color-swatches" role="list">
            {PAGE_COLOR_IDS.map((id) => {
              const color = PAGE_COLORS[id];
              const selected = pageColor === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="listitem"
                  className={`color-swatch${selected ? " is-on" : ""}`}
                  style={selected ? { borderColor: color.swatch, boxShadow: `0 0 0 2px ${color.soft}` } : undefined}
                  onClick={() => {
                    setPageColor(id);
                    window.dispatchEvent(new CustomEvent("dugsi-page-color", { detail: id }));
                  }}
                >
                  <span className="color-swatch-dot" style={{ background: color.swatch }} />
                  <span>{color.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button className="btn btn-primary">Save settings</button>
        {message ? <p className="text-sm text-paid">{message}</p> : null}
      </form>

      <ChangePasswordForm />
    </div>
  );
}

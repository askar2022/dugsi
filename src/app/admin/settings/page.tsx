"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { api } from "@/lib/api";

type Tenant = {
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  welcomeNote: string | null;
};

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ tenant: Tenant }>("/api/settings").then((data) => setTenant(data.tenant));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/settings", { method: "PATCH", body: JSON.stringify(data) });
    setMessage("School settings saved.");
  }

  if (!tenant) return <p>Loading settings...</p>;

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-5">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">School settings</h3>
      <p className="text-sm text-muted">School code: <b>{tenant.slug}</b></p>
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
  );
}

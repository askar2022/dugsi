"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: string;
  _count: { users: number; students: number; classes: number };
};

export default function PlatformPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api<{ tenants: Tenant[] }>("/api/tenants").then((data) => setTenants(data.tenants));
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="font-[family-name:var(--font-fraunces)] text-3xl text-green">Registered dugsis</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{tenant.slug}</p>
            <h4 className="mt-1 text-xl font-semibold text-green">{tenant.name}</h4>
            <p className="text-sm text-muted">{tenant.city ?? "No city"} · {tenant.status}</p>
            <p className="mt-3 text-sm">
              {tenant._count.users} users · {tenant._count.students} students · {tenant._count.classes} classes
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

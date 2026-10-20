"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wallet,
  GraduationCap,
  FileBarChart,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Role, Session } from "@/lib/types";

type NavItem = { href: string; label: string; icon: typeof Home };

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Overview", icon: Home },
    { href: "/admin/students", label: "Enrollment", icon: Users },
    { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
    { href: "/admin/classes", label: "Classes", icon: BookOpen },
    { href: "/admin/staff", label: "Staff", icon: ClipboardList },
    { href: "/admin/billing", label: "Tuition", icon: Receipt },
    { href: "/admin/expenses", label: "Expenses", icon: Wallet },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
  TEACHER: [
    { href: "/teacher", label: "My Class", icon: Home },
    { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/teacher/progress", label: "Quran Progress", icon: BookOpen },
    { href: "/teacher/homework", label: "Homework", icon: ClipboardList },
  ],
  PARENT: [
    { href: "/parent", label: "Home", icon: Home },
    { href: "/parent/enroll", label: "Enroll", icon: Users },
    { href: "/parent/attendance", label: "Attendance", icon: CalendarDays },
    { href: "/parent/homework", label: "Homework", icon: ClipboardList },
    { href: "/parent/progress", label: "Progress", icon: BookOpen },
    { href: "/parent/billing", label: "Tuition", icon: Receipt },
  ],
  PLATFORM: [{ href: "/platform", label: "Schools", icon: Home }],
};

export function PortalShell({
  role,
  title,
  children,
}: {
  role: Role;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Session | null>(null);

  useEffect(() => {
    api<{ user: Session }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"));
  }, [router]);

  const items = NAV[role === "STAFF" ? "ADMIN" : role] ?? [];

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-line bg-green text-white lg:flex lg:flex-col">
        <div className="px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Dugsi</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-white/70">{user?.tenantName ?? "Loading school..."}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="m-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-white/80 hover:bg-white/10">
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <div>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{user?.tenantSlug ?? "dugsi"}</p>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-green">{title}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden rounded-full bg-gold-soft px-3 py-1 text-green sm:inline">{user?.name}</span>
            <button onClick={logout} className="btn btn-ghost px-3 py-2 text-sm lg:hidden">
              Sign out
            </button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
        <nav className="sticky bottom-0 grid grid-cols-4 gap-1 border-t border-line bg-white px-2 py-2 lg:hidden">
          {items.slice(0, 4).map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-2 py-2 text-center text-[11px] text-green">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

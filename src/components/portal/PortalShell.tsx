"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Contact,
  FileBarChart,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Role, Session } from "@/lib/types";

type NavItem = { href: string; label: string; icon: typeof Home };

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Overview", icon: Home },
    { href: "/admin/enrollment", label: "Enrollment", icon: UserPlus },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/parents", label: "Parents", icon: Contact },
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

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const root = item.href === "/admin" || item.href === "/teacher" || item.href === "/parent" || item.href === "/platform";
        const current = pathname === item.href || (!root && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium no-underline ${
              current
                ? "bg-gold-soft text-green shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<{ user: Session }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const items = NAV[role === "STAFF" ? "ADMIN" : role] ?? [];
  const schoolName = user?.tenantName ?? title;
  const greeting = user?.name ? `Assalamu alaikum, ${user.name}` : "Assalamu alaikum";

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="hidden bg-green text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Your school</p>
          <p className="mt-3 font-display text-2xl leading-snug">{schoolName}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavLinks items={items} pathname={pathname} />
        </div>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-green-deep/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <aside className="relative z-50 flex h-full w-[min(86vw,20rem)] flex-col bg-green text-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Your school</p>
                <p className="mt-2 font-display text-xl leading-snug">{schoolName}</p>
              </div>
              <button className="rounded-full p-2 hover:bg-white/10" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks items={items} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="border-t border-white/10 p-4">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-cream/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl border border-line bg-white p-2 text-green lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl text-green md:text-2xl">{greeting}</p>
              <p className="truncate text-sm text-muted">{schoolName}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

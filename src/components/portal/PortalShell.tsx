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
type NavSection = { label: string; items: NavItem[] };

const NAV: Record<string, NavSection[]> = {
  ADMIN: [
    {
      label: "School",
      items: [
        { href: "/admin", label: "Overview", icon: Home },
        { href: "/admin/enrollment", label: "Enrollment", icon: UserPlus },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/admin/students", label: "Students", icon: Users },
        { href: "/admin/parents", label: "Parents", icon: Contact },
        { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
        { href: "/admin/classes", label: "Classes", icon: BookOpen },
        { href: "/admin/staff", label: "Staff", icon: ClipboardList },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/admin/billing", label: "Tuition", icon: Receipt },
        { href: "/admin/expenses", label: "Expenses", icon: Wallet },
      ],
    },
    {
      label: "Reports & Settings",
      items: [
        { href: "/admin/reports", label: "Reports", icon: FileBarChart },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  TEACHER: [
    {
      label: "Classroom",
      items: [
        { href: "/teacher", label: "Class Roster", icon: Users },
        { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
        { href: "/teacher/progress", label: "Quran Progress", icon: BookOpen },
        { href: "/teacher/homework", label: "Homework", icon: ClipboardList },
      ],
    },
  ],
  PARENT: [
    {
      label: "Family",
      items: [
        { href: "/parent", label: "Home", icon: Home },
        { href: "/parent/attendance", label: "Attendance", icon: CalendarDays },
        { href: "/parent/homework", label: "Homework", icon: ClipboardList },
        { href: "/parent/progress", label: "Child Progress", icon: BookOpen },
        { href: "/parent/billing", label: "Tuition", icon: Receipt },
      ],
    },
  ],
  PLATFORM: [{ label: "Platform", items: [{ href: "/platform", label: "Schools", icon: Home }] }],
};

function itemActive(href: string, pathname: string) {
  const root = href === "/admin" || href === "/teacher" || href === "/parent" || href === "/platform";
  return pathname === href || (!root && pathname.startsWith(`${href}/`));
}

function NavLinks({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="portal-nav">
      {sections.map((section) => (
        <div key={section.label} className="nav-section">
          <p className="nav-section-label">{section.label}</p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const current = itemActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`portal-nav-link${current ? " is-active" : ""}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
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

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const sections = NAV[role === "STAFF" ? "ADMIN" : role] ?? [];
  const schoolName = user?.tenantName ?? title;
  const greeting = user?.name ? `Assalamu alaikum, ${user.name}` : "Assalamu alaikum";

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const sidebarBody = (
    <>
      <div className="portal-brand">
        <p className="portal-brand-kicker">OurDugsi</p>
        <p className="portal-brand-name">{schoolName}</p>
      </div>
      <div className="portal-nav-scroll">
        <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      </div>
      <div className="portal-side-foot">
        <button onClick={logout} className="portal-nav-link portal-signout">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="portal">
      <aside className="portal-sidebar">{sidebarBody}</aside>

      {menuOpen ? (
        <div className="portal-drawer" onClick={() => setMenuOpen(false)}>
          <aside className="portal-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="portal-brand portal-brand-row">
              <div>
                <p className="portal-brand-kicker">OurDugsi</p>
                <p className="portal-brand-name">{schoolName}</p>
              </div>
              <button className="portal-close-btn" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="portal-nav-scroll">
              <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="portal-side-foot">
              <button onClick={logout} className="portal-nav-link portal-signout">
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </aside>
          <button className="portal-drawer-mask" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
        </div>
      ) : null}

      <div className="portal-main">
        <header className="portal-header">
          <button className="portal-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="portal-hello">
            <p className="portal-hello-title">{greeting}</p>
            <p className="portal-hello-school">{schoolName}</p>
          </div>
        </header>
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Role, Session } from "@/lib/types";

type NavLink = { href: string; label: string };
type NavGroup = {
  href: string;
  label: string;
  icon: typeof Home;
  links?: NavLink[];
};

const NAV: Record<string, NavGroup[]> = {
  ADMIN: [
    { href: "/admin", label: "Overview", icon: Home },
    {
      href: "/admin/enrollment",
      label: "Enrollment",
      icon: Users,
      links: [
        { href: "/admin/enrollment", label: "New students" },
        { href: "/admin/students", label: "Students" },
        { href: "/admin/parents", label: "Parents" },
      ],
    },
    {
      href: "/admin/teachers",
      label: "Teachers & Classes",
      icon: GraduationCap,
      links: [
        { href: "/admin/teachers", label: "Teachers" },
        { href: "/admin/classes", label: "Classes" },
        { href: "/admin/staff", label: "Staff" },
      ],
    },
    {
      href: "/admin/billing",
      label: "Tuition & Expenses",
      icon: Receipt,
      links: [
        { href: "/admin/billing", label: "Tuition" },
        { href: "/admin/expenses", label: "Expenses" },
      ],
    },
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

function isActive(href: string, pathname: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(group: NavGroup, pathname: string) {
  if (group.links?.length) {
    return group.links.some((link) => isActive(link.href, pathname, true));
  }
  return isActive(group.href, pathname, true);
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="portal-nav">
      {groups.map((group) => {
        const current = groupActive(group, pathname);
        const Icon = group.icon;
        return (
          <div key={group.href}>
            <Link
              href={group.href}
              onClick={onNavigate}
              className={`portal-nav-link${current ? " is-active" : ""}`}
            >
              <Icon size={18} />
              {group.label}
            </Link>
            {current && group.links ? (
              <div style={{ display: "grid", gap: 4, padding: "0.25rem 0 0.4rem 2.4rem" }}>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    className="subnav-link"
                    style={{
                      background: pathname === link.href ? "white" : "transparent",
                      color: pathname === link.href ? "var(--green)" : "rgba(255,255,255,0.78)",
                      borderColor: pathname === link.href ? "white" : "transparent",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
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

  const groups = NAV[role === "STAFF" ? "ADMIN" : role] ?? [];
  const schoolName = user?.tenantName ?? title;
  const greeting = user?.name ? `Assalamu alaikum, ${user.name}` : "Assalamu alaikum";
  const currentGroup = groups.find((group) => groupActive(group, pathname));

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const sidebar = (
    <>
      <div className="portal-brand">
        <p className="portal-brand-kicker">Dugsi Management</p>
        <p className="portal-brand-name">{schoolName}</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <NavLinks groups={groups} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "1rem" }}>
        <button onClick={logout} className="portal-nav-link portal-signout">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="portal">
      <aside className="portal-sidebar">{sidebar}</aside>

      {menuOpen ? (
        <div className="portal-drawer">
          <button className="portal-drawer-mask" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <aside className="portal-drawer-panel">
            <div className="portal-brand" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p className="portal-brand-kicker">Dugsi Management</p>
                <p className="portal-brand-name">{schoolName}</p>
              </div>
              <button className="portal-menu-btn" onClick={() => setMenuOpen(false)} aria-label="Close" style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.2)" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <NavLinks groups={groups} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "1rem" }}>
              <button onClick={logout} className="portal-nav-link portal-signout">
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </aside>
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
        {currentGroup?.links ? (
          <div className="portal-subnav">
            {currentGroup.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`subnav-link${pathname === link.href ? " is-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}

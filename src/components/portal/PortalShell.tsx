"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Contact,
  Activity,
  FileBarChart,
  GraduationCap,
  Home,
  KeyRound,
  List,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Table2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { SchoolTheme } from "@/components/SchoolTheme";
import { api } from "@/lib/api";
import { roleLoginPath } from "@/lib/login-path";
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
        { href: "/admin/attendance", label: "Attendance", icon: CalendarDays },
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
        { href: "/admin/progress", label: "Qur’an Progress", icon: BookOpen },
        { href: "/admin/performance", label: "Performance", icon: Activity },
        { href: "/admin/reports", label: "Administrative Reports", icon: FileBarChart },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  TEACHER: [
    {
      label: "Classroom",
      items: [
        { href: "/teacher", label: "Home", icon: Home },
        { href: "/teacher/roster", label: "Class Roster", icon: Users },
        { href: "/teacher/attendance", label: "Attendance", icon: CalendarDays },
      ],
    },
    {
      label: "Qur’an Progress",
      items: [
        { href: "/teacher/progress/record", label: "Record Progress", icon: BookOpen },
        { href: "/teacher/progress/view", label: "View Progress", icon: Table2 },
      ],
    },
    {
      label: "Homework",
      items: [
        { href: "/teacher/homework/assign", label: "Assign Homework", icon: ClipboardList },
        { href: "/teacher/homework/view", label: "View Homework", icon: List },
      ],
    },
    {
      label: "Account",
      items: [{ href: "/teacher/password", label: "Password", icon: KeyRound }],
    },
  ],
  PARENT: [
    {
      label: "Family",
      items: [
        { href: "/parent", label: "Home", icon: Home },
        { href: "/parent/students", label: "My Children", icon: Users },
        { href: "/parent/attendance", label: "Attendance", icon: CalendarDays },
        { href: "/parent/homework", label: "Homework", icon: ClipboardList },
        { href: "/parent/progress", label: "Child Progress", icon: BookOpen },
        { href: "/parent/billing", label: "Tuition", icon: Receipt },
        { href: "/parent/password", label: "Password", icon: KeyRound },
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
  const [pageColor, setPageColor] = useState("green");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api<{ user: Session }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace(roleLoginPath(role)));
  }, [router, role]);

  useEffect(() => {
    if (role === "PLATFORM") return;
    api<{ tenant: { pageColor?: string } }>("/api/settings")
      .then((data) => setPageColor(data.tenant.pageColor ?? "green"))
      .catch(() => setPageColor("green"));
  }, [role]);

  useEffect(() => {
    function onColor(event: Event) {
      const color = (event as CustomEvent<string>).detail;
      if (color) setPageColor(color);
    }
    window.addEventListener("dugsi-page-color", onColor);
    return () => window.removeEventListener("dugsi-page-color", onColor);
  }, []);

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
    router.replace(roleLoginPath(role, user?.tenantSlug));
  }

  const teacherDock = [
    { href: "/teacher/roster", label: "Class", icon: Users },
    { href: "/teacher/attendance", label: "Attend", icon: CalendarDays },
    { href: "/teacher/progress/view", label: "Quran", icon: BookOpen },
    { href: "/teacher/homework/view", label: "Homework", icon: ClipboardList },
  ];

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
    <SchoolTheme pageColor={role === "PLATFORM" ? "green" : pageColor}>
    <div className={`portal${role === "TEACHER" ? " is-teacher" : ""}`}>
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
        {role === "TEACHER" ? (
          <nav className="teacher-dock" aria-label="Teacher pages">
            {teacherDock.map((item) => {
              const Icon = item.icon;
              const current =
                item.href === "/teacher/homework/view"
                  ? pathname.startsWith("/teacher/homework")
                  : item.href === "/teacher/progress/view"
                    ? pathname.startsWith("/teacher/progress")
                    : itemActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`teacher-dock-link${current ? " is-active" : ""}`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
    </SchoolTheme>
  );
}

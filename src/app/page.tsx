import Link from "next/link";
import { BookOpen, ClipboardList, Receipt, Users } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";

const sections = [
  {
    title: "Your own school page",
    text: "Each dugsi gets a private landing page for its families. Enrollment and logins stay on that school’s page, not on Our Dugsi.",
    icon: Users,
  },
  {
    title: "Office, teachers, and parents",
    text: "Admin and staff review enrollment and records. Teachers open their class. Parents open their children after the school invites them.",
    icon: BookOpen,
  },
  {
    title: "Records stay in that school",
    text: "Students, attendance, Quran progress, and tuition colors belong to one dugsi. Other schools cannot see them.",
    icon: Receipt,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gold">For dugsis</p>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-5xl leading-tight text-green md:text-6xl">
              Welcome your school to Our Dugsi
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Our Dugsi is the home for opening a new school or signing in to run one you already have.
              Families do not enroll here. They use your school’s own page.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Create a new dugsi
              </Link>
              <Link href="/login" className="btn btn-ghost">
                Sign in to your school
              </Link>
            </div>
          </div>
          <div className="card p-6">
            <div className="grid gap-4">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className="rounded-2xl bg-green-soft p-4">
                    <div className="flex items-center gap-3 text-green">
                      <Icon size={20} />
                      <h2 className="font-semibold">{section.title}</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted">{section.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "New school", Icon: Users },
            { label: "School page", Icon: BookOpen },
            { label: "Office tools", Icon: ClipboardList },
            { label: "Tuition records", Icon: Receipt },
          ].map(({ label, Icon }) => (
            <div key={label} className="card p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green text-white">
                <Icon size={20} />
              </div>
              <p className="mt-3 font-medium text-green">{label}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

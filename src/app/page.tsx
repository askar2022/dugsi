import Link from "next/link";
import { BookOpen, ClipboardList, Receipt, Users } from "lucide-react";

const sections = [
  {
    title: "Dugsi Management",
    text: "Enrollment, teachers, classes, tuition records, expenses, and reports for each school.",
    icon: Users,
  },
  {
    title: "Teacher Portal",
    text: "Class roster, attendance, Quran progress, and homework for the teacher's own class.",
    icon: BookOpen,
  },
  {
    title: "Parent Portal",
    text: "Online enrollment, attendance, homework, child progress, and tuition status colors.",
    icon: Receipt,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Multi-tenant</p>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl text-green">Dugsi</p>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary">
            Register a dugsi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gold">Each school keeps its own records</p>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-5xl leading-tight text-green md:text-6xl">
              One platform. Many dugsis. Three portals.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Every dugsi registers with its own name and school code. Students, attendance,
              billing records, and reports stay inside that school. Web and mobile use the same backend.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Create your school
              </Link>
              <Link href="/login" className="btn btn-ghost">
                Use a demo school
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
            { label: "Enrollment", Icon: Users },
            { label: "Teachers & Classes", Icon: BookOpen },
            { label: "Tuition & Expenses", Icon: Receipt },
            { label: "Reports", Icon: ClipboardList },
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

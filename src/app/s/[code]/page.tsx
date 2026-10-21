import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Receipt, UserPlus, Users } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { getPublicSchool } from "@/lib/public-school";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const school = await getPublicSchool(code);
  return {
    title: school ? school.name : "School",
    description: school?.welcomeNote || "Enroll your child at this dugsi.",
  };
}

export default async function SchoolLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const school = await getPublicSchool(code);
  if (!school) notFound();

  const logins = [
    {
      href: `/login?school=${school.code}&portal=admin`,
      title: "Admin & staff",
      text: "Review enrollment and run this school.",
      icon: Users,
    },
    {
      href: `/login?school=${school.code}&portal=teacher`,
      title: "Teachers",
      text: "Open your class, attendance, and Quran progress.",
      icon: GraduationCap,
    },
    {
      href: `/login?school=${school.code}&portal=parent`,
      title: "Parents",
      text: "See your child after this school invites you.",
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen">
      <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gold">
              {school.city || "Dugsi"}
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-5xl leading-tight text-green md:text-6xl">
              {school.name}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              {school.welcomeNote || "Assalamu alaikum. Enroll your child here. You do not need an account to apply."}
            </p>
            {school.phone ? <p className="mt-3 text-sm text-muted">{school.phone}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/enroll/${school.code}`} className="btn btn-primary">
                <UserPlus size={18} />
                Enroll your child
              </Link>
              <Link href={`/login?school=${school.code}&portal=parent`} className="btn btn-ghost">
                Parent sign in
              </Link>
            </div>
          </div>
          <div className="card overflow-hidden p-0">
            <SchoolImage
              src={school.imageUrl}
              name={school.name}
              alt={`${school.name} photo`}
              message={school.name}
            />
          </div>
        </section>

        <section className="card p-6">
          <p className="hero-kicker">How to enroll</p>
          <ol className="mt-4 grid gap-2 text-sm text-muted">
            <li>1. Open Enroll your child on this school page.</li>
            <li>2. Enter the parent and child details. No login and no password.</li>
            <li>3. The child waits for assessment. This school then places them in a class.</li>
          </ol>
        </section>

        <section className="mt-8">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">This school’s logins</p>
          <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl text-green">Sign in</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {logins.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} href={item.href} className="card p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-semibold text-green">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.text}</p>
                  <p className="mt-4 text-sm font-medium text-green">Sign in →</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

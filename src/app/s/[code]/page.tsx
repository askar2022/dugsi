import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { schoolLoginPath } from "@/lib/login-path";
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
              <Link href={schoolLoginPath("parent", school.code)} className="btn btn-ghost">
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

      </main>
    </div>
  );
}

import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { RememberSchool } from "@/components/public/RememberSchool";
import { SchoolHopeStrip } from "@/components/public/SchoolHope";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { SchoolTheme } from "@/components/SchoolTheme";
import { getPublicSchoolHope } from "@/lib/public-hope";
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
  const [school, hope] = await Promise.all([getPublicSchool(code), getPublicSchoolHope(code)]);
  if (!school) notFound();

  return (
    <SchoolTheme pageColor={school.pageColor}>
    <div className="min-h-screen">
      <RememberSchool code={school.code} />
      <PublicHeader variant="school" schoolName={school.name} schoolCode={school.code} />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="card overflow-hidden p-0">
          <SchoolImage
            src={school.imageUrl}
            name={school.name}
            alt={`${school.name} photo`}
            message={school.name}
          />
        </section>

        {hope ? <SchoolHopeStrip hope={hope} /> : null}

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
    </SchoolTheme>
  );
}

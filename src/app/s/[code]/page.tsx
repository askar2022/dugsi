import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { RememberSchool } from "@/components/public/RememberSchool";
import { SchoolHopeStrip } from "@/components/public/SchoolHope";
import { SchoolImage } from "@/components/portal/SchoolImage";
import { SchoolTheme } from "@/components/SchoolTheme";
import { schoolLoginPath } from "@/lib/login-path";
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

        <section className="card login-choose p-6">
          <p className="hero-kicker">Three separate logins</p>
          <p className="mt-2 text-sm text-muted">
            Office, Teacher, and Parent are three different doors. The person who opened this dugsi uses Office. That login does not open Teacher or Parent.
          </p>
          <div className="login-choose-grid three">
            <Link className="card login-choose-card" href={schoolLoginPath("admin", school.code)}>
              <img src="/admin_image.png" alt="" />
              <div>
                <h2>Office</h2>
                <p>The login created when this dugsi was registered. Use that username and password here.</p>
              </div>
            </Link>
            <Link className="card login-choose-card" href={schoolLoginPath("teacher", school.code)}>
              <img src="/teacher_image.png" alt="" />
              <div>
                <h2>Teacher</h2>
                <p>Teachers only. Create your own account. The office approves it on Staff.</p>
              </div>
            </Link>
            <Link className="card login-choose-card" href={schoolLoginPath("parent", school.code)}>
              <img src="/parent_Image.png" alt="" />
              <div>
                <h2>Parent</h2>
                <p>Families only. Enroll your child to create a parent username and password.</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="card p-6">
          <p className="hero-kicker">How to enroll</p>
          <ol className="mt-4 grid gap-2 text-sm text-muted">
            <li>1. Open Enroll your child on this school page.</li>
            <li>2. The parent creates their own username and password. Do not share one login.</li>
            <li>3. The child waits for assessment. This school then places them in a class.</li>
          </ol>
        </section>
      </main>
    </div>
    </SchoolTheme>
  );
}

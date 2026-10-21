import { PublicHeader } from "@/components/PublicHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="page-stack mx-auto max-w-6xl px-6 pb-20">
        <section className="card overflow-hidden p-0">
          <img className="login-welcome-image" src="/ourdugsi-landing.jpg" alt="Our Dugsi" />
        </section>

        <section className="card p-6">
          <p className="hero-kicker">For schools</p>
          <ol className="mt-4 grid gap-2 text-sm text-muted">
            <li>1. Create your dugsi here. You get a school page and a school code.</li>
            <li>2. Families enroll and sign in on that school page, not on Our Dugsi.</li>
            <li>3. Admin, teachers, and parents each use their own login on the school page.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

import type { SchoolHope } from "@/lib/public-hope";

export function SchoolHopeStrip({ hope }: { hope: SchoolHope }) {
  const max = Math.max(1, ...hope.months.map((item) => item.count));
  const cards = [
    { label: "Students", value: hope.students, note: "Learning Quran together" },
    { label: "Juz this month", value: hope.juzThisMonth, note: "Finished this month" },
    { label: "Halfway", value: hope.halfQuran, note: "Reached Juz 15 or more" },
    { label: "Near Khatm", value: hope.nearFinish, note: "Close to finishing the Quran" },
  ];

  return (
    <section className="card hope-strip">
      <p className="hero-kicker">Our students</p>
      <h2 className="hope-title">Progress that gives families hope</h2>
      <div className="hope-cards">
        {cards.map((card) => (
          <article key={card.label} className="hope-card">
            <p className="hope-value">{card.value}</p>
            <p className="hope-label">{card.label}</p>
            <p className="hope-note">{card.note}</p>
          </article>
        ))}
      </div>
      <div className="hope-chart" aria-label="Juz finished each month">
        {hope.months.map((month) => (
          <div key={month.key} className="hope-col">
            <span className="hope-col-count">{month.count}</span>
            <div className="hope-track">
              <div className="hope-bar" style={{ height: month.count ? `${Math.max(12, (month.count / max) * 100)}%` : "0.35rem" }} />
            </div>
            <span className="hope-col-label">{month.label}</span>
          </div>
        ))}
      </div>
      <p className="hope-caption">Juz finished in the last six months. Names stay private.</p>
    </section>
  );
}

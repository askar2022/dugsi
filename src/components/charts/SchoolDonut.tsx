import Link from "next/link";

export type DonutSlice = {
  label: string;
  value: number;
  tone: "paid" | "due" | "late" | "gold" | "muted";
};

const TONES: Record<DonutSlice["tone"], string> = {
  paid: "var(--paid)",
  due: "var(--due)",
  late: "var(--late)",
  gold: "var(--gold)",
  muted: "var(--cream-deep)",
};

export function SchoolDonut({
  title,
  slices,
  href,
}: {
  title: string;
  slices: DonutSlice[];
  href?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const lead = [...slices].sort((a, b) => b.value - a.value)[0];
  const leadPct = total && lead ? Math.round((lead.value / total) * 100) : 0;

  return (
    <article className="card school-chart-card">
      <h3 className="school-chart-title">{title}</h3>
      {total === 0 ? (
        <p className="school-chart-empty">No records yet.</p>
      ) : (
        <>
          <div className="school-donut-wrap">
            <svg className="school-donut" viewBox="0 0 42 42" role="img" aria-label={title}>
              <circle className="school-donut-track" cx="21" cy="21" r={radius} />
              {slices.map((slice) => {
                if (slice.value <= 0) return null;
                const length = (slice.value / total) * circumference;
                const circle = (
                  <circle
                    key={slice.label}
                    cx="21"
                    cy="21"
                    r={radius}
                    stroke={TONES[slice.tone]}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              })}
            </svg>
            <div className="school-donut-center">
              <p>{leadPct}%</p>
              <span>{lead?.label}</span>
            </div>
          </div>
          <ul className="school-chart-legend">
            {slices.map((slice) => (
              <li key={slice.label}>
                <span className={`school-chart-swatch is-${slice.tone}`} />
                {slice.label}
              </li>
            ))}
          </ul>
        </>
      )}
      {href ? (
        <Link className="school-chart-link" href={href}>
          Open
        </Link>
      ) : null}
    </article>
  );
}

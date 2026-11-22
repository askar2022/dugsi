export type BarGroup = {
  label: string;
  paid: number;
  unpaid: number;
};

export function SchoolBars({
  title,
  groups,
  paidLabel = "Paid",
  unpaidLabel = "Unpaid",
}: {
  title: string;
  groups: BarGroup[];
  paidLabel?: string;
  unpaidLabel?: string;
}) {
  const max = Math.max(1, ...groups.flatMap((group) => [group.paid, group.unpaid]));
  const hasValues = groups.some((group) => group.paid > 0 || group.unpaid > 0);

  return (
    <article className="card school-chart-card school-bars-card">
      <h3 className="school-chart-title">{title}</h3>
      {!hasValues ? (
        <p className="school-chart-empty">No payment records yet.</p>
      ) : (
        <>
          <div className="school-bars" role="img" aria-label={title}>
            {groups.map((group) => (
              <div key={group.label} className="school-bar-group">
                <div className="school-bar-pair">
                  <span className="school-bar is-paid" style={{ height: `${Math.round((group.paid / max) * 100)}%` }} />
                  <span className="school-bar is-unpaid" style={{ height: `${Math.round((group.unpaid / max) * 100)}%` }} />
                </div>
                <p>{group.label}</p>
              </div>
            ))}
          </div>
          <ul className="school-chart-legend">
            <li>
              <span className="school-chart-swatch is-paid" />
              {paidLabel}
            </li>
            <li>
              <span className="school-chart-swatch is-gold" />
              {unpaidLabel}
            </li>
          </ul>
        </>
      )}
    </article>
  );
}

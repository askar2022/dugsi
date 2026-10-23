import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { FAMILY_RATING_LABELS, type RatingKey } from "@/lib/performance";

export type ClassCard = {
  id: string;
  name: string;
  teacherName: string;
  students: number;
  onTrackCount: number;
  attentionCount: number;
  supportCount: number;
  onTrackPct: number | null;
  needsSupportPct: number | null;
  score: number | null;
  rating: RatingKey | "none";
  homeworkAssigned: number;
  homeworkReviewed: number;
  attendanceDays: number;
  trend: Array<{ start: string; end: string; onTrackCount?: number; total?: number; onTrackPct: number | null }>;
};

export type FamilyCard = {
  id: string;
  name: string;
  students: number;
  onTimeCount?: number;
  arrivalCount?: number;
  onTimeArrival: number | null;
  homeworkAssigned?: number;
  homeworkReviewed?: number;
  homeworkFollowUp: number | null;
  pickupRecorded: boolean;
  score: number | null;
  rating: RatingKey | "none";
};

export type SchoolCard = {
  students: number;
  onTrackCount: number;
  attentionCount: number;
  supportCount: number;
  onTrackPct: number | null;
  rating: RatingKey | "none";
};

function badge(rating: RatingKey | "none") {
  return rating === "none" ? "needs_attention" : rating;
}

function of(part: number, whole: number) {
  return `${part} of ${whole}`;
}

function Bar({ value, max, tone }: { value: number; max: number; tone: "paid" | "due" | "late" }) {
  const width = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="perf-bar" aria-hidden="true">
      <span className={`perf-bar-fill is-${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "paid" | "due" | "late" | "muted";
}) {
  return (
    <div className={`perf-stat is-${tone}`}>
      <p className="perf-stat-value">{value}</p>
      <p className="perf-stat-label">{label}</p>
    </div>
  );
}

export function SchoolPerformanceCard({
  item,
  windowLabel,
}: {
  item: SchoolCard;
  windowLabel?: string;
}) {
  return (
    <article className="card perf-card">
      <div className="perf-card-top">
        <div>
          <p className="perf-kicker">Last four weeks</p>
          <h2 className="perf-title">Whole dugsi</h2>
          <p className="perf-sub">{item.students} students{windowLabel ? ` · ${windowLabel}` : ""}</p>
        </div>
        <StatusBadge status={badge(item.rating)} />
      </div>
      <p className="perf-lead">{of(item.onTrackCount, item.students)} on track</p>
      <Bar value={item.onTrackCount} max={item.students} tone="paid" />
      <div className="perf-stats">
        <Stat value={of(item.onTrackCount, item.students)} label="On Track" tone="paid" />
        <Stat value={of(item.attentionCount, item.students)} label="Needs Attention" tone="due" />
        <Stat value={of(item.supportCount, item.students)} label="Support Needed" tone="late" />
      </div>
    </article>
  );
}

export function ClassPerformanceCard({
  item,
  studentsHref,
}: {
  item: ClassCard;
  studentsHref?: string;
}) {
  return (
    <article className="card perf-card">
      <div className="perf-card-top">
        <div>
          <p className="perf-kicker">{item.teacherName}</p>
          <h2 className="perf-title">{item.name}</h2>
          <p className="perf-sub">{item.students} students</p>
        </div>
        <StatusBadge status={badge(item.rating)} />
      </div>
      <p className="perf-lead">{of(item.onTrackCount, item.students)} on track</p>
      <Bar value={item.onTrackCount} max={item.students} tone={item.rating === "support_needed" ? "late" : item.rating === "needs_attention" ? "due" : "paid"} />
      <div className="perf-stats">
        <Stat value={of(item.onTrackCount, item.students)} label="On Track" tone="paid" />
        <Stat value={of(item.attentionCount, item.students)} label="Needs Attention" tone="due" />
        <Stat value={of(item.supportCount, item.students)} label="Support Needed" tone="late" />
      </div>
      <div className="perf-stats">
        <Stat value={item.homeworkAssigned ? of(item.homeworkReviewed, item.homeworkAssigned) : "—"} label="Homework reviewed" tone="muted" />
        <Stat value={`${item.attendanceDays} of 4`} label="Days recorded" tone="muted" />
        <Stat
          value={item.trend.map((week) => (week.total ? of(week.onTrackCount ?? 0, week.total) : "—")).join(" · ")}
          label="Weekly on track"
          tone="muted"
        />
      </div>
      {studentsHref ? (
        <Link href={studentsHref} className="btn btn-primary perf-card-btn">View Students</Link>
      ) : null}
    </article>
  );
}

export function FamilyPerformanceCard({
  item,
  href,
}: {
  item: FamilyCard;
  href?: string;
}) {
  const arrivals = item.arrivalCount ?? 0;
  const assigned = item.homeworkAssigned ?? 0;
  return (
    <article className="card perf-card">
      <div className="perf-card-top">
        <div>
          <p className="perf-kicker">{item.students} students</p>
          <h2 className="perf-title">{item.name}</h2>
          <p className="perf-sub">
            {item.rating === "none" ? "Not enough records yet" : FAMILY_RATING_LABELS[item.rating]}
          </p>
        </div>
        <StatusBadge status={badge(item.rating)} />
      </div>
      <Bar value={item.onTimeCount ?? 0} max={arrivals} tone={item.rating === "support_needed" ? "late" : item.rating === "needs_attention" ? "due" : "paid"} />
      <div className="perf-stats">
        <Stat value={arrivals ? of(item.onTimeCount ?? 0, arrivals) : "—"} label="On-time arrival" tone="paid" />
        <Stat value={assigned ? of(item.homeworkReviewed ?? 0, assigned) : "—"} label="Homework follow-up" tone="due" />
        <Stat value="—" label="On-time pickup" tone="muted" />
      </div>
      {href ? (
        <Link href={href} className="btn btn-primary perf-card-btn">View Students</Link>
      ) : null}
    </article>
  );
}

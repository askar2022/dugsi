import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CLASS_RATING_LABELS,
  FAMILY_RATING_LABELS,
  type RatingKey,
} from "@/lib/performance";

export type ClassCard = {
  id: string;
  name: string;
  teacherName: string;
  students: number;
  onTrackPct: number | null;
  needsSupportPct: number | null;
  supportCount: number;
  score: number | null;
  rating: RatingKey | "none";
  homeworkAssigned: number;
  homeworkReviewed: number;
  attendanceDays: number;
  trend: Array<{ start: string; end: string; onTrackPct: number | null }>;
};

export type FamilyCard = {
  id: string;
  name: string;
  students: number;
  onTimeArrival: number | null;
  homeworkFollowUp: number | null;
  pickupRecorded: boolean;
  score: number | null;
  rating: RatingKey | "none";
};

function tone(rating: RatingKey | "none") {
  if (rating === "on_track") return "on_track";
  if (rating === "needs_attention") return "needs_practice";
  if (rating === "support_needed") return "contact_parent";
  return "needs_practice";
}

function pct(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

export function Trend({ points }: { points: ClassCard["trend"] }) {
  return (
    <div className="performance-trend" aria-label="Four-week on-track trend">
      {points.map((point, index) => (
        <span key={`${point.start}-${index}`} className="performance-trend-item">
          <span className="record-meta">W{index + 1}</span>
          <strong>{pct(point.onTrackPct)}</strong>
        </span>
      ))}
    </div>
  );
}

export function ClassPerformanceCard({
  item,
  href,
}: {
  item: ClassCard;
  href?: string;
}) {
  const rating = item.rating === "none" ? "needs_attention" : item.rating;
  const body = (
    <article className={`card record-card-stack progress-row is-${tone(item.rating)}`}>
      <div className="homework-card-top">
        <p className="record-title">{item.teacherName} — {item.name}</p>
        <StatusBadge status={rating} />
      </div>
      <p className="record-meta">
        {item.students} student{item.students === 1 ? "" : "s"}
        {item.onTrackPct != null ? ` | ${item.onTrackPct}% On Track` : ""}
        {item.rating !== "none" ? ` | ${CLASS_RATING_LABELS[item.rating]}` : ""}
      </p>
      {item.supportCount > 0 ? (
        <p className="record-meta">{item.supportCount} student{item.supportCount === 1 ? "" : "s"} need additional support</p>
      ) : (
        <p className="record-meta">No students below 60% this window.</p>
      )}
      <p className="record-meta">
        Homework {item.homeworkAssigned} assigned · {item.homeworkReviewed} reviewed
      </p>
      <p className="record-meta">
        Attendance recorded {item.attendanceDays} class day{item.attendanceDays === 1 ? "" : "s"}
      </p>
      <Trend points={item.trend} />
    </article>
  );
  return href ? <Link href={href} className="performance-link">{body}</Link> : body;
}

export function FamilyPerformanceCard({
  item,
  href,
}: {
  item: FamilyCard;
  href?: string;
}) {
  const rating = item.rating === "none" ? "needs_attention" : item.rating;
  const body = (
    <article className={`card record-card-stack progress-row is-${tone(item.rating)}`}>
      <div className="homework-card-top">
        <p className="record-title">{item.name}</p>
        <StatusBadge status={rating} />
      </div>
      <p className="record-meta">{item.students} student{item.students === 1 ? "" : "s"}</p>
      <p className="record-meta">On-time arrival: {pct(item.onTimeArrival)}</p>
      <p className="record-meta">On-time pickup: not recorded yet</p>
      <p className="record-meta">Homework follow-up: {pct(item.homeworkFollowUp)}</p>
      <p className="record-meta">
        Overall: {item.rating === "none" ? "Not enough records yet" : FAMILY_RATING_LABELS[item.rating]}
      </p>
    </article>
  );
  return href ? <Link href={href} className="performance-link">{body}</Link> : body;
}

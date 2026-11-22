import Link from "next/link";
import { SchoolDonut } from "@/components/charts/SchoolDonut";
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

function noneCount(item: { students: number; onTrackCount: number; attentionCount: number; supportCount: number }) {
  return Math.max(0, item.students - item.onTrackCount - item.attentionCount - item.supportCount);
}

function quranSlices(item: { students: number; onTrackCount: number; attentionCount: number; supportCount: number }) {
  return [
    { label: "On track", value: item.onTrackCount, tone: "paid" as const },
    { label: "Needs practice", value: item.attentionCount, tone: "due" as const },
    { label: "Needs support", value: item.supportCount, tone: "late" as const },
    { label: "No record", value: noneCount(item), tone: "muted" as const },
  ];
}

export function SchoolPerformanceCard({
  item,
  windowLabel,
  homework,
  attendance,
}: {
  item: SchoolCard;
  windowLabel?: string;
  homework?: { reviewed: number; assigned: number };
  attendance?: { recorded: number; expected: number };
}) {
  const assigned = homework?.assigned ?? 0;
  const reviewed = homework?.reviewed ?? 0;
  const recorded = attendance?.recorded ?? 0;
  const expected = attendance?.expected ?? 0;

  return (
    <section className="school-graphics">
      {windowLabel ? (
        <p className="record-meta school-bars-card">
          {item.students} students · {windowLabel}
        </p>
      ) : null}
      <SchoolDonut title="Qur’an" slices={quranSlices(item)} />
      <SchoolDonut
        title="Homework"
        slices={[
          { label: "Reviewed", value: reviewed, tone: "paid" },
          { label: "Waiting", value: Math.max(0, assigned - reviewed), tone: "gold" },
        ]}
      />
      <SchoolDonut
        title="Attendance"
        slices={[
          { label: "Recorded", value: recorded, tone: "paid" },
          { label: "Missing", value: Math.max(0, expected - recorded), tone: "due" },
        ]}
      />
    </section>
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
    <article className="card school-chart-card">
      <p className="perf-kicker">{item.teacherName}</p>
      <h3 className="school-chart-title">{item.name}</h3>
      <SchoolDonut title={`${item.name} Qur’an`} slices={quranSlices(item)} embed />
      {studentsHref ? (
        <Link href={studentsHref} className="school-chart-link">
          Open
        </Link>
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
  const onTime = item.onTimeCount ?? 0;
  const assigned = item.homeworkAssigned ?? 0;
  const reviewed = item.homeworkReviewed ?? 0;

  return (
    <article className="card school-chart-card">
      <p className="perf-kicker">{item.students} students</p>
      <h3 className="school-chart-title">{item.name}</h3>
      <p className="record-meta">{item.rating === "none" ? "Not enough records yet" : FAMILY_RATING_LABELS[item.rating]}</p>
      <SchoolDonut
        title={`${item.name} arrival`}
        slices={[
          { label: "On time", value: onTime, tone: "paid" },
          { label: "Late", value: Math.max(0, arrivals - onTime), tone: "due" },
        ]}
        embed
      />
      {assigned ? (
        <SchoolDonut
          title={`${item.name} homework`}
          slices={[
            { label: "Followed up", value: reviewed, tone: "paid" },
            { label: "Waiting", value: Math.max(0, assigned - reviewed), tone: "gold" },
          ]}
          embed
        />
      ) : null}
      {href ? (
        <Link href={href} className="school-chart-link">
          Open
        </Link>
      ) : null}
    </article>
  );
}

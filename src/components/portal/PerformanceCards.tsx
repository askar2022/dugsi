import Link from "next/link";
import { SchoolDonut } from "@/components/charts/SchoolDonut";
import { FAMILY_RATING_LABELS, type RatingKey } from "@/lib/performance";

type HomeworkPicture = { done: number; needsHelp: number; waiting: number };
type AttendancePicture = { present: number; late: number; absent: number };

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
  homework?: HomeworkPicture;
  attendanceDays: number;
  attendance?: AttendancePicture;
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
  homework?: HomeworkPicture;
  attendance?: AttendancePicture;
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
}: {
  item: SchoolCard;
  windowLabel?: string;
}) {
  const homework = item.homework ?? { done: 0, needsHelp: 0, waiting: 0 };
  const attendance = item.attendance ?? { present: 0, late: 0, absent: 0 };

  return (
    <section className="school-graphics">
      {windowLabel ? (
        <p className="record-meta school-bars-card">
          {item.students} students · homework and attendance {windowLabel}
        </p>
      ) : null}
      <SchoolDonut title="Qur’an" slices={quranSlices(item)} href="/admin/progress" />
      <SchoolDonut
        title="Homework"
        slices={[
          { label: "Done", value: homework.done, tone: "paid" },
          { label: "Needs help", value: homework.needsHelp, tone: "late" },
          { label: "Waiting", value: homework.waiting, tone: "gold" },
        ]}
      />
      <SchoolDonut
        title="Attendance"
        slices={[
          { label: "Present", value: attendance.present, tone: "paid" },
          { label: "Late", value: attendance.late, tone: "due" },
          { label: "Absent", value: attendance.absent, tone: "late" },
        ]}
        href="/admin/attendance"
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

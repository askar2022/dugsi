import { isNewCoverage, sortProgress, type ProgressPlace } from "@/lib/progress-compare";
import { normalizeProgressStatus } from "@/lib/progress-status";

export const PERFORMANCE_DAYS = 28;

export type RatingKey = "on_track" | "needs_attention" | "support_needed";

export const CLASS_RATING_LABELS: Record<RatingKey, string> = {
  on_track: "On Track",
  needs_attention: "Needs Attention",
  support_needed: "Support Needed",
};

export const FAMILY_RATING_LABELS: Record<RatingKey, string> = {
  on_track: "Strong Support",
  needs_attention: "Some Follow-Up Needed",
  support_needed: "Please Contact Family",
};

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function windowRange(today = todayIso()) {
  return { start: addDays(today, -(PERFORMANCE_DAYS - 1)), end: today };
}

export function inWindow(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export function weekRanges(end: string) {
  return [3, 2, 1, 0].map((offset) => {
    const weekEnd = addDays(end, -offset * 7);
    return { start: addDays(weekEnd, -6), end: weekEnd };
  });
}

export function ratingFromScore(score: number | null): RatingKey | "none" {
  if (score == null) return "none";
  if (score >= 80) return "on_track";
  if (score >= 60) return "needs_attention";
  return "support_needed";
}

export function average(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (!nums.length) return null;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

export function percent(part: number, whole: number) {
  if (!whole) return null;
  return Math.round((part / whole) * 100);
}

export function quranOwnGoalScore(
  records: ProgressPlace[],
  start: string,
  end: string,
  required = false,
) {
  const history = sortProgress(records);
  const latest = history.find((item) => inWindow(item.date, start, end));
  if (!latest) return required ? 0 : null;

  const previous = history.find((item) => item.date < latest.date || (item.date === latest.date && item.id !== latest.id));
  const tone = normalizeProgressStatus(latest.status);
  let score = tone === "on_track" ? 88 : tone === "needs_practice" ? 68 : 42;
  if (previous && isNewCoverage(previous, latest)) {
    score = tone === "on_track" ? 100 : Math.max(score, 80);
  } else if (!previous && tone === "on_track") {
    score = 90;
  }
  return score;
}

export function attendanceScore(marks: Array<{ status: string }>) {
  const counted = marks.filter((mark) => mark.status !== "excused");
  if (!counted.length) return { score: null as number | null, present: 0, late: 0, absent: 0, recorded: marks.length };
  const present = counted.filter((mark) => mark.status === "present").length;
  const late = counted.filter((mark) => mark.status === "late").length;
  const absent = counted.filter((mark) => mark.status === "absent").length;
  const score = Math.round(((present * 100) + (late * 55)) / counted.length);
  return { score, present, late, absent, recorded: marks.length };
}

export function arrivalScore(marks: Array<{ status: string }>) {
  const arrivals = marks.filter((mark) => mark.status === "present" || mark.status === "late");
  if (!arrivals.length) return { score: null as number | null, onTime: 0, late: 0 };
  const onTime = arrivals.filter((mark) => mark.status === "present").length;
  return { score: percent(onTime, arrivals.length), onTime, late: arrivals.length - onTime };
}

export function homeworkFollowUp(assigned: number, reviewed: number, done = 0) {
  if (!assigned) return { score: null as number | null, assigned, reviewed, done };
  return { score: percent(reviewed, assigned), assigned, reviewed, done };
}

export function homeworkAssignedToStudent(
  item: { classId: string; studentId?: string | null; completions?: Array<{ studentId: string }> | null },
  student: { id: string; classId?: string | null },
) {
  if (item.studentId) return item.studentId === student.id;
  if (item.completions?.length) return item.completions.some((row) => row.studentId === student.id);
  return Boolean(student.classId && item.classId === student.classId);
}

export function completionFollowedUp(status?: string | null) {
  return status === "done" || status === "needs_help" || status === "not_finished";
}

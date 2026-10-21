import { surahByName } from "@/lib/quran";
import { normalizeProgressStatus } from "@/lib/progress-status";

export type ProgressPlace = {
  id?: string;
  surah: string;
  ayahFrom: number;
  ayahTo: number;
  juz: number | null;
  date: string;
  status?: string | null;
};

export function shortPlace(place: ProgressPlace) {
  return `${place.surah} ${place.ayahFrom}–${place.ayahTo}`;
}

export function placeLabel(place: ProgressPlace) {
  return place.juz ? `Juz ${place.juz} · ${shortPlace(place)}` : shortPlace(place);
}

function cursor(place: ProgressPlace) {
  const surah = surahByName(place.surah);
  return {
    surah: surah?.number ?? 0,
    start: Number(place.ayahFrom || 0),
    end: Number(place.ayahTo || place.ayahFrom || 0),
  };
}

export function isNewCoverage(previous: ProgressPlace, latest: ProgressPlace) {
  const before = cursor(previous);
  const after = cursor(latest);
  if (after.surah > before.surah) return true;
  if (after.surah < before.surah) return false;
  return after.end > before.end || after.start > before.end;
}

export function isTeacherConfirmed(place: ProgressPlace) {
  return normalizeProgressStatus(place.status) === "on_track";
}

export function sortProgress(records: ProgressPlace[]) {
  return [...records].sort((left, right) => {
    const dates = right.date.localeCompare(left.date);
    if (dates) return dates;
    return (right.id ?? "").localeCompare(left.id ?? "");
  });
}

export function historyKind(item: ProgressPlace, older?: ProgressPlace | null) {
  if (!older) return "First record";
  if (isTeacherConfirmed(item) && isNewCoverage(older, item)) return "New ayahs";
  const tone = normalizeProgressStatus(item.status);
  if (tone === "needs_practice") return "Practice";
  if (tone === "contact_parent") return "Needs support";
  return "Review";
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function latestOnOrBefore(records: ProgressPlace[], date: string) {
  return records.find((item) => item.date <= date && isTeacherConfirmed(item)) ?? null;
}

function periodChange(records: ProgressPlace[], days: number, label: string) {
  if (records.length < 2) return null;
  const today = records[0]?.date;
  if (!today) return null;
  const start = addDays(today, -days);
  const now = latestOnOrBefore(records, today);
  const before = latestOnOrBefore(records, start);
  if (!now || !before || now.id === before.id) return null;
  if (!isNewCoverage(before, now)) return null;
  return {
    label,
    text: `${label}: ${shortPlace(before)} → ${shortPlace(now)}.`,
  };
}

export function describeProgress(records: ProgressPlace[]) {
  const history = sortProgress(records);
  const latest = history[0] ?? null;
  const previous = history[1] ?? null;
  let change: { kind: "advanced" | "review"; text: string } | null = null;

  if (latest && previous) {
    const advanced = isTeacherConfirmed(latest) && isNewCoverage(previous, latest);
    const tone = normalizeProgressStatus(latest.status);
    if (advanced) {
      change = {
        kind: "advanced",
        text: `Last update: ${shortPlace(previous)}. Now: ${shortPlace(latest)}.`,
      };
    } else if (tone === "needs_practice") {
      change = {
        kind: "review",
        text: `Last update: ${shortPlace(previous)}. Now reviewing ${shortPlace(latest)} — needs practice.`,
      };
    } else if (tone === "contact_parent") {
      change = {
        kind: "review",
        text: `Last update: ${shortPlace(previous)}. Now: ${shortPlace(latest)} — contact the school.`,
      };
    } else {
      change = {
        kind: "review",
        text: `Last update: ${shortPlace(previous)}. Now reviewing ${shortPlace(latest)}.`,
      };
    }
  }

  return {
    history,
    latest,
    previous,
    change,
    weekly: periodChange(history, 7, "This week"),
    quarterly: periodChange(history, 90, "This quarter"),
  };
}

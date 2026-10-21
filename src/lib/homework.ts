export const HOMEWORK_KINDS = ["reading", "memorization", "review", "written"] as const;

export type HomeworkKind = (typeof HOMEWORK_KINDS)[number];

export const HOMEWORK_KIND_LABELS: Record<HomeworkKind, string> = {
  reading: "Reading",
  memorization: "Memorization",
  review: "Review",
  written: "Written work",
};

export const HOMEWORK_COMPLETION_STATUSES = ["assigned", "done", "needs_help"] as const;

export type HomeworkCompletionStatus = (typeof HOMEWORK_COMPLETION_STATUSES)[number];

export function normalizeHomeworkKind(value?: string | null): HomeworkKind {
  if (value === "memorization" || value === "review" || value === "written") return value;
  return "reading";
}

export function homeworkTitle(input: {
  kind?: string | null;
  surah?: string | null;
  ayahFrom?: number | null;
  ayahTo?: number | null;
  fallback?: string | null;
}) {
  const kind = HOMEWORK_KIND_LABELS[normalizeHomeworkKind(input.kind)];
  if (input.surah && input.ayahFrom && input.ayahTo) {
    return `${kind} · ${input.surah} ${input.ayahFrom}–${input.ayahTo}`;
  }
  if (input.surah) return `${kind} · ${input.surah}`;
  return input.fallback?.trim() || kind;
}

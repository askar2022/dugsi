export const HOMEWORK_KINDS = ["reading", "memorization", "review", "written"] as const;

export type HomeworkKind = (typeof HOMEWORK_KINDS)[number];

export const HOMEWORK_KIND_LABELS: Record<HomeworkKind, string> = {
  reading: "Reading",
  memorization: "Memorization",
  review: "Review",
  written: "Written Work",
};

export const HOMEWORK_COMPLETION_STATUSES = ["assigned", "done", "needs_help"] as const;

export type HomeworkCompletionStatus = (typeof HOMEWORK_COMPLETION_STATUSES)[number];

export function normalizeHomeworkKind(value?: string | null): HomeworkKind {
  if (value === "memorization" || value === "review" || value === "written") return value;
  return "reading";
}

export function homeworkCompletionCounts(rows: Array<{ status?: string | null }>) {
  return {
    done: rows.filter((row) => row.status === "done").length,
    needsHelp: rows.filter((row) => row.status === "needs_help").length,
    assigned: rows.filter((row) => row.status !== "done" && row.status !== "needs_help").length,
  };
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

export type HomeworkTab = "current" | "completed" | "past";

export function homeworkTab(
  completions: Array<{ status?: string | null }>,
  dueDate: string | null | undefined,
  asOf: string,
): HomeworkTab {
  const counts = homeworkCompletionCounts(completions);
  const total = counts.done + counts.needsHelp + counts.assigned;
  const finished = total > 0 && counts.assigned === 0;
  if (finished) return "completed";
  if (dueDate && dueDate < asOf) return "past";
  return "current";
}

export function homeworkTabLabel(tab: HomeworkTab) {
  if (tab === "completed") return "Completed";
  if (tab === "past") return "Past Due";
  return "Active";
}

export function homeworkWaitingLine(completions: Array<{ status?: string | null }>) {
  const counts = homeworkCompletionCounts(completions);
  const total = counts.done + counts.needsHelp + counts.assigned;
  if (total <= 1 && counts.assigned === total) return `${total || 1} student · Waiting`;
  return `${total} students · ${counts.done} completed · ${counts.assigned} waiting`;
}

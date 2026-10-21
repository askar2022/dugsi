export const PROGRESS_STATUSES = ["on_track", "needs_practice", "contact_parent"] as const;

export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  on_track: "On track",
  needs_practice: "Needs practice",
  contact_parent: "Contact parent",
};

export function normalizeProgressStatus(value?: string | null): ProgressStatus {
  if (value === "needs_practice" || value === "contact_parent") return value;
  return "on_track";
}

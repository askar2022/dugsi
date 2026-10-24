export const PROGRESS_STATUSES = ["on_track", "needs_practice", "contact_parent"] as const;

export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  on_track: "On Track",
  needs_practice: "Needs Practice",
  contact_parent: "Needs Support",
};

export function normalizeProgressStatus(value?: string | null): ProgressStatus {
  if (value === "needs_practice" || value === "contact_parent") return value;
  return "on_track";
}

export function classSupportTone(counts: { on_track: number; needs_practice: number; contact_parent: number; none: number }) {
  if (counts.contact_parent > 0) return "contact_parent" as const;
  if (counts.needs_practice > 0) return "needs_practice" as const;
  if (counts.on_track > 0) return "on_track" as const;
  return "no_record" as const;
}

export const SUPPORT_LABELS: Record<string, string> = {
  on_track: "On Track",
  needs_practice: "Needs Practice",
  contact_parent: "Needs Support",
  no_record: "No Record",
};

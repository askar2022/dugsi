export const ENROLLMENT_STAGES = ["submitted", "waiting", "ready", "enrolled"] as const;

export type EnrollmentStage = (typeof ENROLLMENT_STAGES)[number];

export const ENROLLMENT_STAGE_LABELS: Record<EnrollmentStage, string> = {
  submitted: "Applications Submitted",
  waiting: "Waiting for Assessment",
  ready: "Ready for Class",
  enrolled: "Enrolled",
};

export type AssessmentRecord = {
  readingLevel: string;
  juz: number | null;
  surah: string;
  ayah: number | null;
  notes: string;
  recommendedClassId: string;
  assessedAt: string;
};

export function parseEnrollmentNotes(notes?: string | null) {
  try {
    return notes ? JSON.parse(notes) as {
      guardianName?: string;
      guardianEmail?: string;
      guardianPhone?: string;
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      age?: number;
      agreedFeeAndEnroll?: boolean;
      notes?: string;
      assessment?: Partial<AssessmentRecord> | null;
    } : {};
  } catch {
    return {};
  }
}

export function assessmentFromNotes(notes?: string | null): AssessmentRecord | null {
  const extra = parseEnrollmentNotes(notes).assessment;
  if (!extra?.readingLevel && !extra?.surah) return null;
  return {
    readingLevel: extra.readingLevel ?? "",
    juz: extra.juz ?? null,
    surah: extra.surah ?? "",
    ayah: extra.ayah ?? null,
    notes: extra.notes ?? "",
    recommendedClassId: extra.recommendedClassId ?? "",
    assessedAt: extra.assessedAt ?? "",
  };
}

export function assessmentLabel(assessment?: AssessmentRecord | null) {
  if (!assessment?.readingLevel && !assessment?.surah) return "Not completed";
  if (assessment.readingLevel) return assessment.readingLevel;
  if (assessment.surah && assessment.ayah) return `${assessment.surah} ${assessment.ayah}`;
  return assessment.surah || "Completed";
}

export function mergeAssessmentNotes(notes: string | null | undefined, assessment: AssessmentRecord) {
  const extra = parseEnrollmentNotes(notes);
  return JSON.stringify({ ...extra, assessment });
}

export function enrollmentStage(input: {
  status?: string | null;
  hasStudent?: boolean;
  assessment?: AssessmentRecord | null;
}): EnrollmentStage {
  if (input.status === "enrolled") return "enrolled";
  if (input.status === "ready_for_class" || input.assessment) return "ready";
  if (input.status === "waiting_assessment" || input.status === "pending" || input.hasStudent) return "waiting";
  return "submitted";
}

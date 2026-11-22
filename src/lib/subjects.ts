export const QURAN_PARTS = [
  { key: "taxfiid", label: "Taxfiid", description: "Memorization" },
  { key: "tajwiid", label: "Tajwiid", description: "Recitation rules" },
  { key: "tafsiir", label: "Tafsiir", description: "Explanation" },
] as const;

export const SUBJECTS = [
  {
    key: "higaad",
    label: "Higaad",
    description: "Arabic letters and basic reading before starting Qur’an",
  },
  {
    key: "quran",
    label: "Qur’an",
    description: "Taxfiid (memorization), Tajwiid (recitation rules), and Tafsiir (explanation)",
    parts: QURAN_PARTS,
  },
  {
    key: "akhlaaq",
    label: "Akhlaaq",
    description: "Islamic values, good manners, and everyday behavior",
  },
  {
    key: "axaadiis_siirada",
    label: "Axaadiis & Siirada",
    description: "Hadith and the life of Prophet Muhammad ﷺ",
  },
  {
    key: "hawlaha_dugsiga",
    label: "Hawlaha Dugsiga",
    description: "Dugsi activities and student projects",
  },
  {
    key: "naxwe",
    label: "Naxwe",
    description: "Arabic grammar",
  },
] as const;

export type OfferedSubjectKey = (typeof SUBJECTS)[number]["key"];
export type QuranPartKey = (typeof QURAN_PARTS)[number]["key"];
export type AssignableSubjectKey = Exclude<OfferedSubjectKey, "quran"> | QuranPartKey;

export const OFFERED_SUBJECT_KEYS = SUBJECTS.map((item) => item.key);
export const ASSIGNABLE_SUBJECT_KEYS = SUBJECTS.flatMap((item) =>
  "parts" in item && item.parts ? item.parts.map((part) => part.key) : [item.key],
) as AssignableSubjectKey[];

export function isOfferedSubjectKey(value: string): value is OfferedSubjectKey {
  return (OFFERED_SUBJECT_KEYS as readonly string[]).includes(value);
}

export function isAssignableSubjectKey(value: string): value is AssignableSubjectKey {
  return (ASSIGNABLE_SUBJECT_KEYS as readonly string[]).includes(value);
}

export function assignableKeysForOffered(offered: string[]) {
  const allowed = new Set(offered);
  return SUBJECTS.flatMap((item) => {
    if (!allowed.has(item.key)) return [];
    if ("parts" in item && item.parts) return item.parts.map((part) => part.key);
    return [item.key];
  }) as AssignableSubjectKey[];
}

export function subjectLabel(key: string) {
  for (const item of SUBJECTS) {
    if (item.key === key) return item.label;
    if ("parts" in item && item.parts) {
      const part = item.parts.find((row) => row.key === key);
      if (part) return part.label;
    }
  }
  return key;
}

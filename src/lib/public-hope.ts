import { normalizeSchoolCode } from "@/lib/auth";
import { completedJuzes } from "@/lib/quran";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolHope = {
  students: number;
  juzThisMonth: number;
  halfQuran: number;
  nearFinish: number;
  months: Array<{ key: string; label: string; count: number }>;
};

type ProgressRow = {
  studentId: string;
  juz: number | null;
  surah: string | null;
  ayahFrom: number | null;
  ayahTo: number | null;
  date: string;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleString("en-US", { month: "short" }),
      count: 0,
    };
  });
}

export async function getPublicSchoolHope(code: string): Promise<SchoolHope | null> {
  const slug = normalizeSchoolCode(code);
  if (!slug) return null;
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return null;

  const [students, progress] = await Promise.all([
    admin.from("Student").select("id, status").eq("tenantId", tenant.id),
    admin.from("QuranProgress").select("studentId, juz, surah, ayahFrom, ayahTo, date").eq("tenantId", tenant.id).order("date", { ascending: true }),
  ]);

  const active = new Set(
    (students.data ?? [])
      .filter((item) => item.status !== "unenrolled" && item.status !== "declined")
      .map((item) => item.id),
  );
  const rows = ((progress.data ?? []) as ProgressRow[]).filter((item) => active.has(item.studentId));
  const byStudent = new Map<string, ProgressRow[]>();
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }

  const months = lastMonths(6);
  const thisMonth = monthKey(new Date());
  let juzThisMonth = 0;
  let halfQuran = 0;
  let nearFinish = 0;

  for (const records of byStudent.values()) {
    const latest = [...records].sort((left, right) => right.date.localeCompare(left.date))[0];
    const juz = latest?.juz ?? 0;
    if (juz >= 15) halfQuran += 1;
    if (juz >= 28) nearFinish += 1;
    for (const finished of completedJuzes(records)) {
      const key = finished.date.slice(0, 7);
      const month = months.find((item) => item.key === key);
      if (month) month.count += 1;
      if (key === thisMonth) juzThisMonth += 1;
    }
  }

  return {
    students: active.size,
    juzThisMonth,
    halfQuran,
    nearFinish,
    months,
  };
}

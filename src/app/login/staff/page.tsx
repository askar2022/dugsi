import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SchoolLogin } from "@/components/auth/SchoolLogin";
import { schoolLoginPath } from "@/lib/login-path";
import { SCHOOL_COOKIE, schoolFromCookie } from "@/lib/school-cookie";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, jar] = await Promise.all([searchParams, cookies()]);
  const school = schoolFromCookie(jar.get(SCHOOL_COOKIE)?.value);
  if (school) redirect(schoolLoginPath("staff", school, next ?? null));
  return <SchoolLogin portal="staff" />;
}

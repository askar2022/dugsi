import { notFound, redirect } from "next/navigation";
import { getPublicSchool } from "@/lib/public-school";

const RESERVED = new Set([
  "login",
  "register",
  "enroll",
  "admin",
  "teacher",
  "parent",
  "platform",
  "invite",
  "api",
  "s",
  "school",
  "staff",
  "mobile",
]);

export default async function ShortSchoolPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const slug = code.trim().toLowerCase();
  if (RESERVED.has(slug)) notFound();
  const school = await getPublicSchool(slug);
  if (!school) notFound();
  redirect(`/s/${school.code}`);
}

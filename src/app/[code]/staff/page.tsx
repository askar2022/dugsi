import { SchoolLogin } from "@/components/auth/SchoolLogin";
import { getPublicSchool } from "@/lib/public-school";

export default async function SchoolStaffLoginPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const school = await getPublicSchool(code);
  return <SchoolLogin portal="staff" schoolCode={school?.code} />;
}

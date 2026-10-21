import { SchoolLogin } from "@/components/auth/SchoolLogin";
import { RememberSchool } from "@/components/public/RememberSchool";
import { getPublicSchool } from "@/lib/public-school";

export default async function SchoolTeacherLoginPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const school = await getPublicSchool(code);
  return (
    <>
      {school ? <RememberSchool code={school.code} /> : null}
      <SchoolLogin portal="teacher" schoolCode={school?.code} />
    </>
  );
}

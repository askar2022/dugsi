import { redirect } from "next/navigation";
import { schoolLoginPath } from "@/lib/login-path";

export default async function SchoolAdminAliasPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(schoolLoginPath("admin", code));
}

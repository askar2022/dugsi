import { redirect } from "next/navigation";
import { schoolLoginPath } from "@/lib/login-path";

export default async function SchoolParentAliasPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(schoolLoginPath("parent", code));
}

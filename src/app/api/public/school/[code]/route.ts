import { error, json } from "@/lib/http";
import { getPublicSchool } from "@/lib/public-school";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const school = await getPublicSchool(code);
  if (!school) return error("School not found.", 404);
  return json({ school });
}

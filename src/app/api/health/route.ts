import { json } from "@/lib/http";
import { getAppEnv, getAppUrl } from "@/lib/env";

export async function GET() {
  return json({
    ok: true,
    env: getAppEnv(),
    url: getAppUrl(),
  });
}

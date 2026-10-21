import { json } from "@/lib/http";
import { handleApiError } from "@/lib/guard";
import { ensureNoorDemoLogins } from "@/lib/demo-classroom";

export async function GET() {
  try {
    const demo = await ensureNoorDemoLogins();
    return json({ ok: true, demo });
  } catch (err) {
    return handleApiError(err);
  }
}

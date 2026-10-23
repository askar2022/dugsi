import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { getAppEnv } from "@/lib/env";
import { runFridaySnapshots } from "@/lib/friday-send";
import { runSchoolReminders } from "@/lib/reminders";

function allowCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret) return token === secret;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return getAppEnv() === "development";
}

export async function GET(request: NextRequest) {
  try {
    if (!allowCron(request)) {
      throw new ApiError("Not allowed.", 401);
    }
    const result = await runSchoolReminders();
    const snapshots = await runFridaySnapshots();
    return json({ ok: true, ...result, snapshots });
  } catch (err) {
    return handleApiError(err);
  }
}

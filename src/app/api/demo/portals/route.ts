import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { fillDemoClassroom } from "@/lib/demo-classroom";
import { getAppEnv } from "@/lib/env";

export async function POST(_request: NextRequest) {
  try {
    if (getAppEnv() === "production") {
      throw new ApiError("Demo portal logins are only for staging.", 403);
    }
    const demo = await fillDemoClassroom();
    return json({ ok: true, demo });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { getAppUrl } from "./env";

export function json<T>(data: T, status = 200) {
  const response = NextResponse.json(data, { status });
  applyCors(response);
  return response;
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function applyCors(response: NextResponse) {
  const origin = process.env.MOBILE_ORIGIN ?? getAppUrl();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  return response;
}

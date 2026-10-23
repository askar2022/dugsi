import { applySupabaseEnv } from "./supabase-env";

export type AppEnv = "development" | "staging" | "production";

export function getAppEnv(): AppEnv {
  applySupabaseEnv();
  const value = (process.env.APP_ENV ?? "development").toLowerCase();
  if (value === "staging" || value === "production" || value === "development") {
    return value;
  }
  throw new Error(`APP_ENV must be development, staging, or production. Received: ${value}`);
}

export function getAppUrl() {
  applySupabaseEnv();
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function isProduction() {
  return getAppEnv() === "production";
}

export function isPublicDemoEnabled() {
  return process.env.NEXT_PUBLIC_APP_ENV !== "production";
}

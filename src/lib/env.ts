export type AppEnv = "development" | "staging" | "production";

function readEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppEnv(): AppEnv {
  const value = (process.env.APP_ENV ?? "development").toLowerCase();
  if (value === "staging" || value === "production" || value === "development") {
    return value;
  }
  throw new Error(`APP_ENV must be development, staging, or production. Received: ${value}`);
}

export function getAuthSecret() {
  return readEnv("AUTH_SECRET", "dev-only-change-me-before-staging");
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function isProduction() {
  return getAppEnv() === "production";
}

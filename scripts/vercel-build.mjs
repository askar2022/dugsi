import { spawnSync } from "node:child_process";

function firstValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  firstValue("POSTGRES_PRISMA_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING");

process.env.DIRECT_URL =
  process.env.DIRECT_URL ||
  firstValue("POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_URL");

if (!process.env.APP_ENV && process.env.VERCEL_ENV === "production") {
  process.env.APP_ENV = "production";
} else if (!process.env.APP_ENV && process.env.VERCEL_ENV === "preview") {
  process.env.APP_ENV = "staging";
}

if (!process.env.DATABASE_URL) {
  console.error(
    "No database URL. In Vercel, open Storage / Integrations and connect the Supabase project, or add POSTGRES_URL.",
  );
  process.exit(1);
}

const steps = [
  ["npx", ["prisma", "generate"]],
  ["npx", ["prisma", "migrate", "deploy"]],
  ["npx", ["next", "build"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

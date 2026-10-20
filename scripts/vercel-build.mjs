import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Add the Supabase pooler or direct Postgres URI in Vercel.");
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
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

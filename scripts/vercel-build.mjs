import { spawnSync } from "node:child_process";

process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!process.env.APP_ENV && process.env.VERCEL_ENV === "production") {
  process.env.APP_ENV = "production";
} else if (!process.env.APP_ENV && process.env.VERCEL_ENV === "preview") {
  process.env.APP_ENV = "staging";
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for this Vercel environment.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);

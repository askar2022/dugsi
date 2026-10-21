function firstValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export function applySupabaseEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = firstValue("SUPABASE_URL");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = firstValue(
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = firstValue(
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_SECRET_KEY",
    );
  }

  if (!process.env.APP_URL) {
    process.env.APP_URL = firstValue("NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL");
    if (process.env.APP_URL && !process.env.APP_URL.startsWith("http")) {
      process.env.APP_URL = `https://${process.env.APP_URL}`;
    }
  }

  if (!process.env.APP_ENV) {
    if (process.env.VERCEL_ENV === "production") process.env.APP_ENV = "production";
    else if (process.env.VERCEL_ENV === "preview") process.env.APP_ENV = "staging";
    else process.env.APP_ENV = "development";
  }
}

function firstValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export function applySupabaseEnv() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = firstValue(
      "POSTGRES_PRISMA_URL",
      "POSTGRES_URL",
      "POSTGRES_URL_NON_POOLING",
    );
  }

  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = firstValue(
      "POSTGRES_URL_NON_POOLING",
      "DATABASE_URL",
      "POSTGRES_URL",
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

  return {
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  };
}

export function requireDatabaseUrl() {
  const { databaseUrl } = applySupabaseEnv();
  if (!databaseUrl) {
    throw new Error(
      "No database URL. Connect the Supabase project in Vercel, or set POSTGRES_URL / DATABASE_URL.",
    );
  }
  return databaseUrl;
}

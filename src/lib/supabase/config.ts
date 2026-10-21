import { applySupabaseEnv } from "@/lib/supabase-env";

export function getSupabaseUrl() {
  applySupabaseEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Connect Supabase in Vercel.");
  }
  return url;
}

export function getSupabaseAnonKey() {
  applySupabaseEnv();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Connect Supabase in Vercel.");
  }
  return key;
}

export function getSupabaseServiceRoleKey() {
  applySupabaseEnv();
  if (typeof window !== "undefined") {
    throw new Error("The service-role key cannot be read in the browser.");
  }
  const leaked = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  if (leaked) {
    throw new Error("Do not prefix the service-role key with NEXT_PUBLIC_.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Set it server-side only.");
  }
  return key;
}

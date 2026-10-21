import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./config";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The service-role client cannot run in the browser.");
  }
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

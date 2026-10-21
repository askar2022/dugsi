import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getAppEnv } from "@/lib/env";
import type { Role, Session } from "@/lib/types";
import { ApiError } from "@/lib/errors";

export { throwIfError } from "@/lib/errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

export type AuthedClient = {
  supabase: SupabaseClient;
  session: Session;
};

function toSession(input: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): Session {
  const app = input.app_metadata ?? {};
  const user = input.user_metadata ?? {};
  return {
    userId: input.id,
    email: String(input.email ?? user.email ?? ""),
    name: String(user.name ?? user.full_name ?? input.email ?? ""),
    role: String(app.role ?? "PARENT") as Role,
    tenantId: app.tenant_id ? String(app.tenant_id) : null,
    tenantSlug: app.tenant_slug ? String(app.tenant_slug) : null,
    tenantName: app.tenant_name ? String(app.tenant_name) : null,
  };
}

export async function createCookieClient() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function createBearerClient(token: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAuthedClient(request: NextRequest): Promise<AuthedClient> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const supabase = token ? createBearerClient(token) : await createCookieClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError("Sign in required.", 401);
  }
  let session = toSession(data.user);
  if (!session.tenantId || !session.tenantSlug) {
    const { data: profile } = await supabase
      .from("User")
      .select("id, name, role, tenantId, tenant:Tenant(slug, name)")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile) {
      const tenant = Array.isArray(profile.tenant) ? profile.tenant[0] : profile.tenant;
      session = {
        userId: profile.id,
        email: session.email,
        name: profile.name || session.name,
        role: profile.role as Role,
        tenantId: profile.tenantId,
        tenantSlug: tenant?.slug ?? session.tenantSlug,
        tenantName: tenant?.name ?? session.tenantName,
      };
    }
  }
  return { supabase, session };
}

export async function requireAuthedTenant(request: NextRequest, roles?: Role[]) {
  const authed = await getAuthedClient(request);
  if (!authed.session.tenantId && authed.session.role !== "PLATFORM") {
    throw new ApiError("This action belongs to a school account.", 403);
  }
  if (roles && !roles.includes(authed.session.role)) {
    throw new ApiError("You do not have access to this action.", 403);
  }
  return authed as AuthedClient & { session: Session & { tenantId: string } };
}

export function publicUser(session: Session) {
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    tenantId: session.tenantId,
    tenantSlug: session.tenantSlug,
    tenantName: session.tenantName,
    env: getAppEnv(),
  };
}


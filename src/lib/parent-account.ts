import { createClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Role } from "@/lib/types";

const LOGIN_ROLES: Role[] = ["PARENT", "TEACHER", "ADMIN", "STAFF"];

function roleWord(role: Role) {
  if (role === "TEACHER") return "teacher";
  if (role === "ADMIN" || role === "STAFF") return "admin";
  return "parent";
}

export function parentAuthEmail(username: string, schoolCode: string) {
  const value = username.trim().toLowerCase();
  if (value.includes("@")) return value;
  const clean = value.replace(/[^a-z0-9._-]/g, "");
  if (clean.length < 3) {
    throw new ApiError("Choose a username with at least 3 letters or numbers.");
  }
  return `${clean}@${schoolCode.trim().toLowerCase()}.dugsi`;
}

export function parentUsernameLabel(email: string, schoolCode?: string | null) {
  const value = email.trim().toLowerCase();
  const slug = schoolCode?.trim().toLowerCase();
  if (slug && value.endsWith(`@${slug}.dugsi`)) {
    return value.slice(0, -(slug.length + 7));
  }
  return value;
}

export async function passwordMatches(email: string, password: string) {
  const client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (!error) await client.auth.signOut();
  return !error;
}

export async function resolveSchoolLoginEmail(input: {
  tenantId: string;
  schoolCode: string;
  username: string;
}) {
  const admin = createAdminClient();
  const raw = input.username.trim().toLowerCase();
  if (raw.includes("@")) {
    const { data } = await admin
      .from("User")
      .select("email")
      .eq("tenantId", input.tenantId)
      .eq("email", raw)
      .maybeSingle();
    return data?.email ?? raw;
  }

  const synthetic = parentAuthEmail(raw, input.schoolCode);
  const { data: exact } = await admin
    .from("User")
    .select("email")
    .eq("tenantId", input.tenantId)
    .eq("email", synthetic)
    .maybeSingle();
  if (exact?.email) return exact.email;

  const { data: rows } = await admin
    .from("User")
    .select("email")
    .eq("tenantId", input.tenantId);
  const match = (rows ?? []).find((row) => parentUsernameLabel(row.email, input.schoolCode) === raw);
  return match?.email ?? synthetic;
}

export function isDeliverableEmail(email: string) {
  const value = email.trim().toLowerCase();
  return value.includes("@") && !value.endsWith(".dugsi");
}

export async function setLoginPassword(userId: string, password: string) {
  if (password.trim().length < 8) {
    throw new ApiError("Use at least 8 characters for the password.");
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: password.trim() });
  if (error) {
    throw new ApiError(error.message || "Could not reset that password.");
  }
}

export async function ensureSchoolLogin(input: {
  tenantId: string;
  tenantSlug: string;
  tenantName?: string | null;
  name: string;
  username: string;
  password?: string | null;
  phone?: string | null;
  role: Role;
  requirePassword?: boolean;
  status?: "active" | "inactive";
}) {
  if (!LOGIN_ROLES.includes(input.role)) {
    throw new ApiError("That role cannot have a school login.");
  }
  const email = parentAuthEmail(input.username, input.tenantSlug);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("User")
    .select("id, name, role")
    .eq("tenantId", input.tenantId)
    .eq("email", email)
    .maybeSingle();
  const word = roleWord(input.role);

  if (existing?.id) {
    if (existing.role !== input.role) {
      throw new ApiError(
        `${parentUsernameLabel(email, input.tenantSlug)} already belongs to ${existing.name}. Use a different username.`,
      );
    }
    if (input.password) {
      const ok = await passwordMatches(email, input.password);
      if (!ok) {
        throw new ApiError(`That username is already used. Enter this ${word}’s own password, or choose a new username.`);
      }
    } else if (input.requirePassword) {
      throw new ApiError(`Enter this ${word}’s password.`);
    }
    return { userId: existing.id, email, created: false };
  }

  if (!input.password) {
    throw new ApiError(`Each ${word} needs their own username and password.`);
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
    app_metadata: {
      role: input.role,
      tenant_id: input.tenantId,
      tenant_slug: input.tenantSlug,
      tenant_name: input.tenantName ?? null,
    },
  });
  if (error && /already|registered|exists/i.test(error.message)) {
    throw new ApiError(`That username already has a login. Use this ${word}’s own password, or choose a new username.`);
  }
  if (error || !created.user) {
    throw new ApiError(error?.message || `Could not create that ${word} login.`);
  }

  const { error: profileError } = await admin.from("User").upsert({
    id: created.user.id,
    tenantId: input.tenantId,
    email,
    name: input.name,
    phone: input.phone ?? null,
    role: input.role,
    status: input.status ?? "active",
  });
  if (profileError) {
    throw new ApiError(profileError.message || `Could not save that ${word} login.`);
  }

  return { userId: created.user.id, email, created: true };
}

export async function ensureParentLogin(input: {
  tenantId: string;
  tenantSlug: string;
  tenantName?: string | null;
  name: string;
  username: string;
  password?: string | null;
  phone?: string | null;
  requirePassword?: boolean;
}) {
  return ensureSchoolLogin({ ...input, role: "PARENT" });
}

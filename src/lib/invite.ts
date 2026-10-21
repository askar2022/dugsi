import { ApiError } from "@/lib/guard";
import { getAppUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

export async function inviteSchoolUser(input: {
  tenantId: string;
  tenantSlug: string | null;
  tenantName: string | null;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("User")
    .select("id, name, role")
    .eq("tenantId", input.tenantId)
    .eq("email", email)
    .maybeSingle();
  if (existing?.id) {
    if (existing.role !== input.role) {
      throw new ApiError(
        `${email} already belongs to ${existing.name} (${existing.role}). Use a different email for this ${input.role.toLowerCase()}.`,
      );
    }
    return { userId: existing.id, inviteLink: null as string | null, created: false };
  }

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { name: input.name },
      redirectTo: `${getAppUrl()}/invite`,
    },
  });
  if (error && /already|registered|exists/i.test(error.message)) {
    throw new ApiError("That email already has a login. Use a different email for this person.");
  }

  let userId = linkData?.user?.id ?? null;
  if (!userId) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = users.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
  }
  if (!userId) {
    throw new ApiError(error?.message || "Could not send that invitation.");
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { name: input.name },
    app_metadata: {
      role: input.role,
      tenant_id: input.tenantId,
      tenant_slug: input.tenantSlug,
      tenant_name: input.tenantName,
    },
  });

  const { error: profileError } = await admin.from("User").upsert({
    id: userId,
    tenantId: input.tenantId,
    email,
    name: input.name,
    phone: input.phone ?? null,
    role: input.role,
    status: "invited",
  });
  if (profileError) {
    throw new ApiError(profileError.message || "Could not save that login.");
  }

  return {
    userId,
    inviteLink: linkData?.properties?.action_link ?? null,
    created: true,
  };
}

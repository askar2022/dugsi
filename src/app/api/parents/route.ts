import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { parentWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { ensureParentLogin, isDeliverableEmail, parentUsernameLabel, saveSecurityEmail } from "@/lib/parent-account";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { parentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { data: parents, error } = await supabase
      .from("User")
      .select("id, name, email, phone, status, children:Student!parentId(id, firstName, lastName, status)")
      .eq("tenantId", session.tenantId)
      .eq("role", "PARENT")
      .order("name");
    throwIfError(error, "Could not load parents.");
    return json({
      parents: (parents ?? []).map((parent) => ({
        ...parent,
        username: parentUsernameLabel(parent.email, session.tenantSlug),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = parentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the parent’s name, username, and password.");
    }

    const username = (parsed.data.username || parsed.data.email || "").trim();
    if (username.length < 3) {
      throw new ApiError("Enter a username for this parent.");
    }
    if (!session.tenantSlug) {
      throw new ApiError("This school is missing a school code.");
    }

    const created = await ensureParentLogin({
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      tenantName: session.tenantName,
      name: parsed.data.name,
      username,
      password: parsed.data.password,
      phone: parsed.data.phone,
      requirePassword: true,
    });

    const loginEmail = created.email;
    if (parsed.data.email && isDeliverableEmail(parsed.data.email)) {
      try {
        await saveSecurityEmail(created.userId, parsed.data.email);
      } catch {
        // Column may not be pasted yet.
      }
    }
    if (loginEmail.includes("@") && !loginEmail.endsWith(".dugsi")) {
      const copy = parentWelcomeEmail({
        schoolName: session.tenantName ?? "your school",
        parentName: parsed.data.name,
        email: loginEmail,
        schoolCode: session.tenantSlug,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: loginEmail,
        subject: copy.subject,
        body: copy.body,
        event: "parent_welcome",
      });
    }

    return json({
      parent: {
        id: created.userId,
        name: parsed.data.name,
        email: loginEmail,
        username: parentUsernameLabel(loginEmail, session.tenantSlug),
        phone: parsed.data.phone ?? null,
        status: "active",
      },
    }, created.created ? 201 : 200);
  } catch (err) {
    return handleApiError(err);
  }
}

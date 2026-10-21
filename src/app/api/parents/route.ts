import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { parentWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
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
    return json({ parents: parents ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const parsed = parentSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the parent's name and email.");
    }

    const invited = await inviteSchoolUser({
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      tenantName: session.tenantName,
      email: parsed.data.email,
      name: parsed.data.name,
      role: "PARENT",
      phone: parsed.data.phone,
    });

    const copy = parentWelcomeEmail({
      schoolName: session.tenantName ?? "your school",
      parentName: parsed.data.name,
      email: parsed.data.email.trim().toLowerCase(),
      inviteLink: invited.inviteLink,
      schoolCode: session.tenantSlug,
    });
    await sendTenantEmail({
      tenantId: session.tenantId,
      toEmail: parsed.data.email.trim().toLowerCase(),
      subject: copy.subject,
      body: copy.body,
      event: "parent_welcome",
    });

    return json({
      parent: {
        id: invited.userId,
        name: parsed.data.name,
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone ?? null,
        status: invited.created ? "invited" : "active",
      },
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

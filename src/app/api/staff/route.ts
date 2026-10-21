import { NextRequest } from "next/server";
import { sendTenantEmail } from "@/lib/email";
import { teacherWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import { staffSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const { data: staff, error } = await supabase
      .from("Staff")
      .select("*, user:User!userId(id, email, role, status)")
      .order("name");
    throwIfError(error, "Could not load staff.");
    const { data: teachers } = await supabase
      .from("User")
      .select("id, name, email, phone")
      .eq("tenantId", session.tenantId)
      .eq("role", "TEACHER");
    return json({ staff: staff ?? [], teachers: teachers ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN"]);
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the staff member's name and title.");
    }

    const email = parsed.data.email?.trim().toLowerCase() || null;
    let userId: string | undefined;
    let inviteLink: string | null = null;
    if (parsed.data.createLogin) {
      if (!email) {
        throw new ApiError("Add an email so this person can create their own login.");
      }
      const invited = await inviteSchoolUser({
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tenantName: session.tenantName,
        email,
        name: parsed.data.name,
        role: parsed.data.role ?? "TEACHER",
        phone: parsed.data.phone,
      });
      userId = invited.userId;
      inviteLink = invited.inviteLink;
    }

    const writer = createAdminClient();
    const { data: staff, error } = await writer
      .from("Staff")
      .insert({
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name,
        email,
        phone: parsed.data.phone || null,
        title: parsed.data.title,
        startDate: parsed.data.startDate || null,
        salary: parsed.data.salary,
        notes: parsed.data.notes || null,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save the staff member.");

    if (email) {
      const copy = teacherWelcomeEmail({
        schoolName: session.tenantName ?? "your school",
        teacherName: parsed.data.name,
        title: parsed.data.title,
        inviteLink,
      });
      await sendTenantEmail({
        tenantId: session.tenantId,
        toEmail: email,
        subject: copy.subject,
        body: copy.body,
        event: "staff_onboarded",
      });
    }

    return json({ staff }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

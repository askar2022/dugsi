import { NextRequest } from "next/server";
import { isAssessmentClass } from "@/lib/assessment-class";
import { sendTenantEmail } from "@/lib/email";
import { parentWelcomeEmail, teacherWelcomeEmail } from "@/lib/email-messages";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { inviteSchoolUser } from "@/lib/invite";
import { needsAssignedClass, portalForPosition, STAFF_POSITIONS } from "@/lib/staff-positions";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant, throwIfError } from "@/lib/supabase/request";
import type { Role } from "@/lib/types";
import { staffSchema } from "@/lib/validators";

function loginRoleFor(role: Role): "admin" | "teacher" | "parent" {
  if (role === "PARENT") return "parent";
  if (role === "TEACHER") return "teacher";
  return "admin";
}

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
      throw new ApiError("Enter the full name, phone, email, and position.");
    }
    if (!(STAFF_POSITIONS as string[]).includes(parsed.data.title)) {
      throw new ApiError("Choose a position from the list.");
    }

    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone.trim();
    const status = parsed.data.status === "inactive" ? "inactive" : "active";
    const portal = portalForPosition(parsed.data.title);
    const teaching = needsAssignedClass(parsed.data.title);
    const classId = parsed.data.classId?.trim() || "";
    if (teaching && !classId) {
      throw new ApiError("Assign a class for that teaching role.");
    }

    const writer = createAdminClient();
    if (teaching && classId) {
      const { data: klass } = await writer
        .from("Class")
        .select("id, name, level")
        .eq("id", classId)
        .eq("tenantId", session.tenantId)
        .maybeSingle();
      if (!klass || isAssessmentClass(klass)) {
        throw new ApiError("Choose a regular class for that teacher.");
      }
    }

    let userId: string | undefined;
    let inviteLink: string | null = null;

    if (portal && status === "active") {
      const invited = await inviteSchoolUser({
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tenantName: session.tenantName,
        email,
        name: parsed.data.name,
        role: portal,
        phone,
      });
      userId = invited.userId;
      inviteLink = invited.inviteLink;
    }

    const { data: staff, error } = await writer
      .from("Staff")
      .insert({
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name.trim(),
        email,
        phone,
        title: parsed.data.title,
        status,
        notes: parsed.data.notes || null,
      })
      .select("*")
      .single();
    throwIfError(error, "Could not save the staff member.");

    if (teaching && classId && userId) {
      const { error: classError } = await writer
        .from("Class")
        .update({ teacherId: userId })
        .eq("id", classId)
        .eq("tenantId", session.tenantId);
      throwIfError(classError, "Staff was saved. Could not assign that class.");
    }

    if (portal && status === "active") {
      const copy =
        portal === "PARENT"
          ? parentWelcomeEmail({
              schoolName: session.tenantName ?? "your school",
              parentName: parsed.data.name,
              email,
              inviteLink,
              schoolCode: session.tenantSlug,
            })
          : teacherWelcomeEmail({
              schoolName: session.tenantName ?? "your school",
              teacherName: parsed.data.name,
              title: parsed.data.title,
              inviteLink,
              schoolCode: session.tenantSlug,
              loginRole: loginRoleFor(portal),
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

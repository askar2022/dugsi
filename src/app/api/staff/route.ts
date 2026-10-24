import { NextRequest } from "next/server";
import { isAssessmentClass } from "@/lib/assessment-class";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { saveAdminSecurityEmail } from "@/lib/admin-otp";
import { ensureSchoolLogin, parentUsernameLabel } from "@/lib/parent-account";
import { needsAssignedClass, portalForPosition, STAFF_POSITIONS } from "@/lib/staff-positions";
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
    return json({
      staff: (staff ?? []).map((person) => ({
        ...person,
        username: person.user?.email
          ? parentUsernameLabel(person.user.email, session.tenantSlug)
          : person.email
            ? parentUsernameLabel(person.email, session.tenantSlug)
            : null,
      })),
      teachers: (teachers ?? []).map((teacher) => ({
        ...teacher,
        username: parentUsernameLabel(teacher.email, session.tenantSlug),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN"]);
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Enter the full name, phone, username, password, and position.");
    }
    if (!(STAFF_POSITIONS as string[]).includes(parsed.data.title)) {
      throw new ApiError("Choose a position from the list.");
    }
    if (!session.tenantSlug) {
      throw new ApiError("This school is missing a school code.");
    }

    const username = (parsed.data.username || parsed.data.email || "").trim();
    const phone = parsed.data.phone.trim();
    const status = parsed.data.status === "inactive" ? "inactive" : "active";
    const portal = portalForPosition(parsed.data.title);
    const teaching = needsAssignedClass(parsed.data.title);
    const classId = parsed.data.classId?.trim() || "";
    if (teaching && !classId) {
      throw new ApiError("Assign a class for that teaching role.");
    }
    if (portal && status === "active" && username.length < 3) {
      throw new ApiError("Enter a username for this login.");
    }
    if (portal && status === "active" && !parsed.data.password) {
      throw new ApiError("Each teacher and admin needs their own password.");
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
    let loginEmail = username;

    if (portal && status === "active") {
      const created = await ensureSchoolLogin({
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        tenantName: session.tenantName,
        name: parsed.data.name,
        username,
        password: parsed.data.password,
        phone,
        role: portal,
        requirePassword: true,
      });
      userId = created.userId;
      loginEmail = created.email;
      if ((portal === "ADMIN" || portal === "STAFF") && parsed.data.email) {
        await saveAdminSecurityEmail(writer, created.userId, parsed.data.email);
      }
    }

    const { data: staff, error } = await writer
      .from("Staff")
      .insert({
        tenantId: session.tenantId,
        userId,
        name: parsed.data.name.trim(),
        email: loginEmail || null,
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

    return json({ staff }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

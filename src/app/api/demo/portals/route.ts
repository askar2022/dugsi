import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { getAppEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfError } from "@/lib/supabase/request";

const PASSWORD = "Dugsi123!";

async function ensureUser(input: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  email: string;
  name: string;
  role: "TEACHER" | "PARENT";
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("User")
    .select("id")
    .eq("tenantId", input.tenantId)
    .eq("email", input.email)
    .maybeSingle();

  const metadata = {
    role: input.role,
    tenant_id: input.tenantId,
    tenant_slug: input.tenantSlug,
    tenant_name: input.tenantName,
  };

  if (existing?.id) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: input.name },
      app_metadata: metadata,
    });
    return existing.id;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: input.name },
    app_metadata: metadata,
  });

  if (error || !created.user) {
    throw new ApiError(error?.message || "Could not create that demo login.");
  }

  const { error: profileError } = await admin.from("User").insert({
    id: created.user.id,
    tenantId: input.tenantId,
    email: input.email,
    name: input.name,
    role: input.role,
    status: "active",
  });
  if (profileError) {
    throw new ApiError(profileError.message || "Could not save that demo login.");
  }
  return created.user.id;
}

export async function POST(_request: NextRequest) {
  try {
    if (getAppEnv() === "production") {
      throw new ApiError("Demo portal logins are only for staging.", 403);
    }

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("Tenant")
      .select("id, slug, name")
      .eq("slug", "noor")
      .maybeSingle();
    if (!tenant) {
      throw new ApiError("Create the demo school first, then open the teacher or parent portal.");
    }

    const teacherId = await ensureUser({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      email: "teacher@noor.dugsi",
      name: "Sister Khadija",
      role: "TEACHER",
    });

    const parentId = await ensureUser({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      email: "parent@noor.dugsi",
      name: "Amina Hassan",
      role: "PARENT",
    });

    const { data: staff } = await admin
      .from("Staff")
      .select("id")
      .eq("tenantId", tenant.id)
      .eq("userId", teacherId)
      .maybeSingle();
    if (!staff) {
      await admin.from("Staff").insert({
        tenantId: tenant.id,
        userId: teacherId,
        name: "Sister Khadija",
        email: "teacher@noor.dugsi",
        title: "Lead Quran Teacher",
      });
    }

    let classId: string | null = null;
    const { data: assignedClass } = await admin
      .from("Class")
      .select("id")
      .eq("tenantId", tenant.id)
      .eq("teacherId", teacherId)
      .limit(1)
      .maybeSingle();
    if (assignedClass) {
      classId = assignedClass.id;
    } else {
      const { data: openClass } = await admin
        .from("Class")
        .select("id")
        .eq("tenantId", tenant.id)
        .is("teacherId", null)
        .limit(1)
        .maybeSingle();
      if (openClass) {
        await admin.from("Class").update({ teacherId }).eq("id", openClass.id);
        classId = openClass.id;
      } else {
        const { data: createdClass, error: classError } = await admin
          .from("Class")
          .insert({
            tenantId: tenant.id,
            name: "Saturday Quran Class",
            level: "Year 2",
            dayOfWeek: "Saturday",
            startTime: "09:00",
            endTime: "11:00",
            teacherId,
          })
          .select("id")
          .single();
        throwIfError(classError, "Could not create a class for the teacher.");
        classId = createdClass?.id ?? null;
      }
    }

    if (classId) {
      await admin.from("Student").update({ classId }).eq("tenantId", tenant.id).is("classId", null);
      const { data: inClass } = await admin.from("Student").select("id").eq("classId", classId).limit(1);
      if (!inClass?.length) {
        const { error: studentError } = await admin.from("Student").insert([
          {
            tenantId: tenant.id,
            firstName: "Aisha",
            lastName: "Hassan",
            gender: "girl",
            parentId,
            classId,
            status: "enrolled",
          },
          {
            tenantId: tenant.id,
            firstName: "Omar",
            lastName: "Hassan",
            gender: "boy",
            parentId,
            classId,
            status: "enrolled",
          },
        ]);
        throwIfError(studentError, "Could not add students to the teacher's class.");
      }
    }

    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

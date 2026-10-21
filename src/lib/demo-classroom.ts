import { ApiError } from "@/lib/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfError } from "@/lib/supabase/request";

const PASSWORD = "Dugsi123!";

async function ensureUser(input: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
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

async function ensureStudent(input: {
  tenantId: string;
  parentId: string;
  classId: string;
  firstName: string;
  lastName: string;
  gender: string;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("Student")
    .select("id")
    .eq("tenantId", input.tenantId)
    .eq("firstName", input.firstName)
    .eq("lastName", input.lastName)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("Student")
      .update({ parentId: input.parentId, classId: input.classId, status: "enrolled" })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("Student")
    .insert({
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      parentId: input.parentId,
      classId: input.classId,
      status: "enrolled",
    })
    .select("id")
    .single();
  throwIfError(error, `Could not add ${input.firstName}.`);
  if (!data?.id) throw new ApiError(`Could not add ${input.firstName}.`);
  return data.id;
}

export async function fillDemoClassroom() {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("Tenant")
    .select("id, slug, name")
    .eq("slug", "noor")
    .maybeSingle();
  if (!tenant) {
    throw new ApiError("Create the noor demo school first, then fill the classroom.");
  }

  await ensureUser({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: "admin@noor.dugsi",
    name: "Imam Yusuf",
    role: "ADMIN",
  });
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
      await admin.from("Class").update({ teacherId, name: "Saturday Quran Class", level: "Year 2" }).eq("id", openClass.id);
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
          room: "Room B",
          teacherId,
        })
        .select("id")
        .single();
      throwIfError(classError, "Could not create a class.");
      classId = createdClass?.id ?? null;
    }
  }
  if (!classId) throw new ApiError("Could not find or create a class.");

  await admin
    .from("Student")
    .update({ parentId, classId, status: "enrolled" })
    .eq("tenantId", tenant.id)
    .is("parentId", null);

  const aishaId = await ensureStudent({
    tenantId: tenant.id,
    parentId,
    classId,
    firstName: "Aisha",
    lastName: "Hassan",
    gender: "girl",
  });
  const omarId = await ensureStudent({
    tenantId: tenant.id,
    parentId,
    classId,
    firstName: "Omar",
    lastName: "Hassan",
    gender: "boy",
  });

  const today = new Date().toISOString().slice(0, 10);
  for (const student of [
    { id: aishaId, status: "present" as const },
    { id: omarId, status: "absent" as const },
  ]) {
    await admin.from("Attendance").upsert(
      {
        tenantId: tenant.id,
        studentId: student.id,
        classId,
        date: today,
        status: student.status,
        markedById: teacherId,
      },
      { onConflict: "tenantId,studentId,classId,date" },
    );
  }

  const { data: progress } = await admin.from("QuranProgress").select("id").eq("tenantId", tenant.id).limit(1);
  if (!progress?.length) {
    await admin.from("QuranProgress").insert([
      {
        tenantId: tenant.id,
        studentId: aishaId,
        surah: "Al-Baqarah",
        ayahFrom: 1,
        ayahTo: 25,
        juz: 1,
        date: today,
        recordedById: teacherId,
      },
      {
        tenantId: tenant.id,
        studentId: omarId,
        surah: "Al-Fatiha",
        ayahFrom: 1,
        ayahTo: 7,
        juz: 1,
        date: today,
        recordedById: teacherId,
      },
    ]);
  }

  const { data: homework } = await admin.from("Homework").select("id").eq("tenantId", tenant.id).limit(1);
  if (!homework?.length) {
    await admin.from("Homework").insert({
      tenantId: tenant.id,
      classId,
      title: "Review Surah Al-Fatiha",
      description: "Recite at home with a parent before next Saturday.",
      assignedDate: today,
      dueDate: today,
      assignedById: teacherId,
    });
  }

  const { data: invoices } = await admin.from("Invoice").select("id").eq("tenantId", tenant.id).limit(1);
  if (!invoices?.length) {
    await admin.from("Invoice").insert([
      {
        tenantId: tenant.id,
        studentId: aishaId,
        parentId,
        amount: 80,
        dueDate: today,
        paidDate: today,
        status: "paid",
        period: "October",
      },
      {
        tenantId: tenant.id,
        studentId: omarId,
        parentId,
        amount: 80,
        dueDate: today,
        status: "due",
        period: "October",
      },
      {
        tenantId: tenant.id,
        studentId: omarId,
        parentId,
        amount: 80,
        dueDate: "2026-09-01",
        status: "late",
        period: "September",
      },
    ]);
  }

  await admin
    .from("Tenant")
    .update({
      welcomeNote: "Assalamu alaikum. Saturday class is 9:00–11:00. Please bring a Quran and a water bottle.",
    })
    .eq("id", tenant.id)
    .is("welcomeNote", null);

  return {
    teacherEmail: "teacher@noor.dugsi",
    parentEmail: "parent@noor.dugsi",
    password: PASSWORD,
    students: ["Aisha Hassan", "Omar Hassan"],
  };
}

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

  let userId = existing?.id ?? null;
  if (userId) {
    await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: input.name },
      app_metadata: metadata,
    });
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: input.name },
      app_metadata: metadata,
    });
    if (error && /already|registered|exists/i.test(error.message)) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      userId = users.users.find((user) => user.email?.toLowerCase() === input.email)?.id ?? null;
      if (!userId) throw new ApiError(error.message);
      await admin.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { name: input.name },
        app_metadata: metadata,
      });
    } else if (error || !created.user) {
      throw new ApiError(error?.message || "Could not create that demo login.");
    } else {
      userId = created.user.id;
    }
  }

  if (!userId) {
    throw new ApiError("Could not create that demo login.");
  }

  const profile = {
    id: userId,
    tenantId: input.tenantId,
    email: input.email,
    name: input.name,
    role: input.role,
    status: "active",
  };
  let { error: profileError } = await admin.from("User").upsert(profile);
  if (profileError && /passwordHash/i.test(profileError.message)) {
    ({ error: profileError } = await admin.from("User").upsert({ ...profile, passwordHash: "supabase-auth" }));
  }
  if (profileError) {
    throw new ApiError(profileError.message || "Could not save that demo login.");
  }
  return userId;
}

export async function ensureNoorDemoLogins() {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("Tenant").select("id, slug, name").eq("slug", "noor").maybeSingle();
  if (!tenant) {
    throw new ApiError("Create the Noor sample school first.");
  }

  const adminId = await ensureUser({
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
    name: "Sister Maryam",
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

  const aminaId = await ensureUser({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: "amina@noor.dugsi",
    name: "Sister Amina",
    role: "TEACHER",
  });
  const hodanId = await ensureUser({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: "hodan@noor.dugsi",
    name: "Hodan Ali",
    role: "PARENT",
  });
  const farahId = await ensureUser({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: "farah@noor.dugsi",
    name: "Yusuf Farah",
    role: "PARENT",
  });

  await ensureNoorDemoPerformance({
    tenantId: tenant.id,
    maryamId: teacherId,
    aminaId,
    hassanId: parentId,
    hodanId,
    farahId,
  });

  return {
    password: PASSWORD,
    admin: { email: "admin@noor.dugsi", userId: adminId },
    teacher: { email: "teacher@noor.dugsi", userId: teacherId },
    class2: { email: "amina@noor.dugsi", name: "Sister Amina" },
    parent: { email: "parent@noor.dugsi", userId: parentId, family: "Hassan Family" },
    hodan: { email: "hodan@noor.dugsi", family: "Hodan Family" },
  };
}

function lastSaturdays(count: number) {
  const dates: string[] = [];
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  while (dates.length < count) {
    if (day.getDay() === 6) dates.unshift(day.toISOString().slice(0, 10));
    day.setDate(day.getDate() - 1);
  }
  return dates;
}

async function upsertNamedStudent(input: {
  id: string;
  tenantId: string;
  parentId: string;
  classId: string;
  firstName: string;
  lastName: string;
  gender: string;
}) {
  const admin = createAdminClient();
  const { data: byId } = await admin.from("Student").select("id").eq("id", input.id).maybeSingle();
  const { data: byName } = await admin
    .from("Student")
    .select("id")
    .eq("tenantId", input.tenantId)
    .eq("firstName", input.firstName)
    .eq("lastName", input.lastName)
    .maybeSingle();
  const id = byId?.id ?? byName?.id ?? input.id;
  const row = {
    id,
    tenantId: input.tenantId,
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    parentId: input.parentId,
    classId: input.classId,
    status: "enrolled",
  };
  const { error } = await admin.from("Student").upsert(row);
  throwIfError(error, `Could not save ${input.firstName} ${input.lastName}.`);
  return id;
}

async function ensureNoorDemoPerformance(input: {
  tenantId: string;
  maryamId: string;
  aminaId: string;
  hassanId: string;
  hodanId: string;
  farahId: string;
}) {
  const admin = createAdminClient();
  const saturdays = lastSaturdays(4);

  await admin.from("Class").upsert({
    id: "sample-noor-class",
    tenantId: input.tenantId,
    name: "Weekend Quran",
    level: "Mixed",
    dayOfWeek: "Saturday",
    startTime: "09:00",
    endTime: "11:30",
    room: "Main hall",
    teacherId: input.maryamId,
  });
  await admin.from("Class").upsert({
    id: "sample-noor-class-2",
    tenantId: input.tenantId,
    name: "Class 2",
    level: "Year 2",
    dayOfWeek: "Saturday",
    startTime: "09:00",
    endTime: "11:30",
    room: "Room B",
    teacherId: input.aminaId,
  });

  const { data: aminaStaff } = await admin.from("Staff").select("id").eq("tenantId", input.tenantId).eq("userId", input.aminaId).maybeSingle();
  if (!aminaStaff) {
    await admin.from("Staff").insert({
      tenantId: input.tenantId,
      userId: input.aminaId,
      name: "Sister Amina",
      email: "amina@noor.dugsi",
      title: "Class 2 Teacher",
    });
  }

  const class2 = "sample-noor-class-2";
  const class1 = "sample-noor-class";

  await admin.from("Student").update({ parentId: null }).eq("tenantId", input.tenantId).like("id", "sample-noor-%");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await admin.from("Student").update({ classId: class2, status: "enrolled" }).eq("id", `sample-noor-${n}`).eq("tenantId", input.tenantId);
  }
  for (const n of [10, 11, 12]) {
    await admin.from("Student").update({ classId: class1, parentId: input.farahId, status: "enrolled" }).eq("id", `sample-noor-${n}`).eq("tenantId", input.tenantId);
  }

  const hodanKids = await Promise.all([
    upsertNamedStudent({ id: "sample-noor-hodan-1", tenantId: input.tenantId, parentId: input.hodanId, classId: class2, firstName: "Layla", lastName: "Hodan", gender: "girl" }),
    upsertNamedStudent({ id: "sample-noor-hodan-2", tenantId: input.tenantId, parentId: input.hodanId, classId: class2, firstName: "Bilal", lastName: "Hodan", gender: "boy" }),
    upsertNamedStudent({ id: "sample-noor-hodan-3", tenantId: input.tenantId, parentId: input.hodanId, classId: class2, firstName: "Safa", lastName: "Hodan", gender: "girl" }),
  ]);
  const hassanKids = await Promise.all([
    upsertNamedStudent({ id: "sample-noor-hassan-1", tenantId: input.tenantId, parentId: input.hassanId, classId: class1, firstName: "Aisha", lastName: "Hassan", gender: "girl" }),
    upsertNamedStudent({ id: "sample-noor-hassan-2", tenantId: input.tenantId, parentId: input.hassanId, classId: class1, firstName: "Omar", lastName: "Hassan", gender: "boy" }),
    upsertNamedStudent({ id: "sample-noor-hassan-3", tenantId: input.tenantId, parentId: input.hassanId, classId: class1, firstName: "Maryam", lastName: "Hassan", gender: "girl" }),
  ]);

  const class2Strong = ["sample-noor-1", "sample-noor-2", "sample-noor-3", "sample-noor-4", "sample-noor-5", "sample-noor-6", "sample-noor-7", hodanKids[0], hodanKids[2]];
  const class2Medium = ["sample-noor-8", hodanKids[1]];
  const class2Support = ["sample-noor-9"];
  const class1Strong = hassanKids;
  const class1Support = ["sample-noor-10", "sample-noor-11", "sample-noor-12"];

  const profileOf = (studentId: string) => {
    if (class2Support.includes(studentId) || class1Support.includes(studentId)) return "support" as const;
    if (class2Medium.includes(studentId)) return "medium" as const;
    return "strong" as const;
  };

  const allClass2 = [...class2Strong, ...class2Medium, ...class2Support];
  const allClass1 = [...class1Strong, ...class1Support];

  for (const [week, date] of saturdays.entries()) {
    for (const studentId of allClass2) {
      const profile = profileOf(studentId);
      const status = profile === "support"
        ? week === 3 ? "absent" : "late"
        : profile === "medium"
          ? week === 1 ? "late" : "present"
          : "present";
      const { error } = await admin.from("Attendance").upsert({
        tenantId: input.tenantId,
        studentId,
        classId: class2,
        date,
        status,
        markedById: input.aminaId,
      }, { onConflict: "tenantId,studentId,classId,date" });
      throwIfError(error, "Could not save demo attendance.");
    }
    for (const studentId of allClass1) {
      const profile = profileOf(studentId);
      const status = profile === "support" ? (week % 2 === 0 ? "late" : "present") : "present";
      const { error } = await admin.from("Attendance").upsert({
        tenantId: input.tenantId,
        studentId,
        classId: class1,
        date,
        status,
        markedById: input.maryamId,
      }, { onConflict: "tenantId,studentId,classId,date" });
      throwIfError(error, "Could not save demo attendance.");
    }
  }

  await admin.from("Homework").delete().eq("tenantId", input.tenantId).like("id", "sample-noor-hw-%");
  for (const [week, date] of saturdays.entries()) {
    const ayahTo = 5 + week * 2;
    for (const [classId, assignedById, prefix] of [
      [class2, input.aminaId, "c2"],
      [class1, input.maryamId, "c1"],
    ] as const) {
      const homeworkId = `sample-noor-hw-${prefix}-w${week + 1}`;
      await admin.from("Homework").upsert({
        id: homeworkId,
        tenantId: input.tenantId,
        classId,
        kind: "reading",
        surah: "Al-Baqarah",
        ayahFrom: 1,
        ayahTo,
        juz: 1,
        title: `Reading · Al-Baqarah 1–${ayahTo}`,
        description: "Recite at home with a parent before next class.",
        assignedDate: date,
        dueDate: date,
        assignedById,
      });
      const students = classId === class2 ? allClass2 : allClass1;
      await admin.from("HomeworkCompletion").insert(
        students.map((studentId) => {
          const profile = profileOf(studentId);
          const status = profile === "strong"
            ? "done"
            : profile === "medium"
              ? week === 0 ? "assigned" : "needs_help"
              : week === 3 ? "needs_help" : "assigned";
          return { homeworkId, studentId, status };
        }),
      );
    }
  }

  await admin.from("QuranProgress").delete().eq("tenantId", input.tenantId).like("id", "sample-noor-perf-%");
  for (const [week, date] of saturdays.entries()) {
    for (const studentId of [...allClass2, ...allClass1]) {
      const profile = profileOf(studentId);
      const status = profile === "support" ? "contact_parent" : profile === "medium" ? "needs_practice" : "on_track";
      await admin.from("QuranProgress").insert({
        id: `sample-noor-perf-${studentId}-${week + 1}`,
        tenantId: input.tenantId,
        studentId,
        surah: "Al-Baqarah",
        ayahFrom: 1,
        ayahTo: 10 + week * 8,
        juz: 1,
        date,
        status,
        notes: "Demo progress for Performance",
        recordedById: allClass2.includes(studentId) ? input.aminaId : input.maryamId,
      });
    }
  }
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
        status: "on_track",
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
        status: "needs_practice",
        recordedById: teacherId,
      },
    ]);
  }

  const { data: homework } = await admin.from("Homework").select("id").eq("tenantId", tenant.id).limit(1);
  if (!homework?.length) {
    await admin.from("Homework").insert({
      tenantId: tenant.id,
      classId,
      kind: "review",
      surah: "Al-Fatiha",
      ayahFrom: 1,
      ayahTo: 7,
      juz: 1,
      title: "Review · Al-Fatiha 1–7",
      description: "Recite at home with a parent before next class.",
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

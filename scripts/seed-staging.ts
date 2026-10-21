import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PASSWORD = "Dugsi123!";
const STAGING_REF = "wploiyfewcygrucoysdb";
const PRODUCTION_REF = "trcfknfctcdvnqmzessq";

const SEED_EMAILS = [
  "platform@dugsi.app",
  "admin@noor.dugsi",
  "teacher@noor.dugsi",
  "parent@noor.dugsi",
  "family@noor.dugsi",
  "admin@huda.dugsi",
  "teacher@huda.dugsi",
  "parent@huda.dugsi",
  "family@huda.dugsi",
];

function requireAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for staging.");
  }
  if (url.includes(PRODUCTION_REF) || process.env.APP_ENV === "production") {
    throw new Error("Demo seed is staging only. Refusing the production Supabase project.");
  }
  if (!url.includes(STAGING_REF) && process.env.ALLOW_LOCAL_SEED !== "1") {
    throw new Error(
      "Point NEXT_PUBLIC_SUPABASE_URL at staging (wploiyfewcygrucoysdb), or set ALLOW_LOCAL_SEED=1 for local supabase start.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

async function deleteSeedAuthUsers(admin: SupabaseClient) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data.users ?? []) {
    if (user.email && SEED_EMAILS.includes(user.email)) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

async function createSchoolUser(
  admin: SupabaseClient,
  input: {
    email: string;
    name: string;
    role: string;
    tenantId?: string | null;
    tenantSlug?: string | null;
    tenantName?: string | null;
  },
) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: input.name },
    app_metadata: {
      role: input.role,
      tenant_id: input.tenantId ?? null,
      tenant_slug: input.tenantSlug ?? null,
      tenant_name: input.tenantName ?? null,
    },
  });
  if (error || !data.user) {
    throw error ?? new Error(`Could not create Auth user ${input.email}`);
  }

  const { data: profile, error: profileError } = await admin
    .from("User")
    .insert({
      id: data.user.id,
      tenantId: input.tenantId ?? null,
      email: input.email,
      name: input.name,
      role: input.role,
      status: "active",
    })
    .select("*")
    .single();
  await throwIfError(profileError, `Could not create profile for ${input.email}`);
  return profile;
}

async function seedTenant(
  admin: SupabaseClient,
  input: {
    name: string;
    slug: string;
    city: string;
    welcomeNote: string;
    adminName: string;
    teacherName: string;
    parentName: string;
    otherParentName: string;
    students: Array<{ firstName: string; lastName: string; gender: string; parent: "main" | "other" }>;
  },
) {
  const { data: tenant, error: tenantError } = await admin
    .from("Tenant")
    .insert({
      name: input.name,
      slug: input.slug,
      city: input.city,
      email: `admin@${input.slug}.dugsi`,
      phone: "612-555-0100",
      welcomeNote: input.welcomeNote,
      status: "active",
    })
    .select("*")
    .single();
  await throwIfError(tenantError, "Could not create tenant.");

  const schoolAdmin = await createSchoolUser(admin, {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: `admin@${input.slug}.dugsi`,
    name: input.adminName,
    role: "ADMIN",
  });

  const teacher = await createSchoolUser(admin, {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: `teacher@${input.slug}.dugsi`,
    name: input.teacherName,
    role: "TEACHER",
  });

  const parent = await createSchoolUser(admin, {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: `parent@${input.slug}.dugsi`,
    name: input.parentName,
    role: "PARENT",
  });

  const otherParent = await createSchoolUser(admin, {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    email: `family@${input.slug}.dugsi`,
    name: input.otherParentName,
    role: "PARENT",
  });

  await throwIfError(
    (
      await admin.from("Staff").insert({
        tenantId: tenant.id,
        userId: teacher.id,
        name: input.teacherName,
        email: teacher.email,
        title: "Lead Quran Teacher",
        startDate: "2025-09-01",
        salary: 1800,
      })
    ).error,
    "Could not create staff.",
  );

  const { data: schoolClass, error: classError } = await admin
    .from("Class")
    .insert({
      tenantId: tenant.id,
      name: "Year 2 - Saturday",
      level: "Year 2",
      dayOfWeek: "Saturday",
      startTime: "09:00",
      endTime: "11:00",
      room: "Room B",
      teacherId: teacher.id,
    })
    .select("*")
    .single();
  await throwIfError(classError, "Could not create class.");

  const createdStudents = [];
  for (const child of input.students) {
    const { data: student, error } = await admin
      .from("Student")
      .insert({
        tenantId: tenant.id,
        firstName: child.firstName,
        lastName: child.lastName,
        gender: child.gender,
        parentId: child.parent === "main" ? parent.id : otherParent.id,
        classId: schoolClass.id,
        status: "enrolled",
      })
      .select("*")
      .single();
    await throwIfError(error, "Could not create student.");
    createdStudents.push(student);
  }

  const today = "2026-10-18";
  for (const student of createdStudents) {
    await throwIfError(
      (
        await admin.from("Attendance").insert({
          tenantId: tenant.id,
          studentId: student.id,
          classId: schoolClass.id,
          date: today,
          status: student.firstName === "Zainab" ? "absent" : "present",
          markedById: teacher.id,
        })
      ).error,
      "Could not create attendance.",
    );
    await throwIfError(
      (
        await admin.from("QuranProgress").insert({
          tenantId: tenant.id,
          studentId: student.id,
          surah: "Al-Baqarah",
          ayahFrom: 1,
          ayahTo: student.firstName === "Aisha" ? 25 : 15,
          juz: 1,
          date: today,
          recordedById: teacher.id,
          notes: "Steady recitation this week.",
        })
      ).error,
      "Could not create progress.",
    );
  }

  await throwIfError(
    (
      await admin.from("Homework").insert({
        tenantId: tenant.id,
        classId: schoolClass.id,
        title: "Memorize Surah Al-Fatiha review",
        description: "Recite at home with a parent before next Saturday.",
        assignedDate: "2026-10-18",
        dueDate: "2026-10-25",
        assignedById: teacher.id,
      })
    ).error,
    "Could not create homework.",
  );

  const [first, second, third] = createdStudents;
  await throwIfError(
    (
      await admin.from("Invoice").insert([
        {
          tenantId: tenant.id,
          studentId: first.id,
          parentId: first.parentId,
          amount: 80,
          dueDate: "2026-10-01",
          paidDate: "2026-09-28",
          status: "paid",
          period: "October 2026",
        },
        {
          tenantId: tenant.id,
          studentId: second.id,
          parentId: second.parentId,
          amount: 80,
          dueDate: "2026-10-25",
          status: "due",
          period: "October 2026",
        },
        {
          tenantId: tenant.id,
          studentId: third.id,
          parentId: third.parentId,
          amount: 80,
          dueDate: "2026-09-15",
          status: "late",
          period: "September 2026",
        },
      ])
    ).error,
    "Could not create invoices.",
  );

  await throwIfError(
    (
      await admin.from("Expense").insert([
        {
          tenantId: tenant.id,
          category: "salary",
          amount: 1800,
          date: "2026-10-01",
          vendor: input.teacherName,
          description: "October teacher salary",
        },
        {
          tenantId: tenant.id,
          category: "rent",
          amount: 900,
          date: "2026-10-01",
          vendor: "Masjid building fund",
          description: "Classroom rent",
        },
        {
          tenantId: tenant.id,
          category: "equipment",
          amount: 145,
          date: "2026-10-08",
          vendor: "Learning supplies",
          description: "Whiteboards and Qurans",
        },
      ])
    ).error,
    "Could not create expenses.",
  );

  return { tenant, admin: schoolAdmin };
}

async function main() {
  const admin = requireAdmin();
  await deleteSeedAuthUsers(admin);

  for (const table of [
    "EmailLog",
    "HomeworkCompletion",
    "Homework",
    "Attendance",
    "QuranProgress",
    "Invoice",
    "Expense",
    "Student",
    "Class",
    "Staff",
    "User",
    "Tenant",
  ]) {
    await throwIfError((await admin.from(table).delete().neq("id", "")).error, `Could not clear ${table}.`);
  }

  await createSchoolUser(admin, {
    email: "platform@dugsi.app",
    name: "Platform Operator",
    role: "PLATFORM",
  });

  await seedTenant(admin, {
    name: "Masjid Al-Noor Dugsi",
    slug: "noor",
    city: "Minneapolis",
    welcomeNote: "Assalamu alaikum. Welcome to Masjid Al-Noor Dugsi.",
    adminName: "Imam Yusuf",
    teacherName: "Sister Maryam",
    parentName: "Amina Hassan",
    otherParentName: "Fatima Ali",
    students: [
      { firstName: "Aisha", lastName: "Hassan", gender: "girl", parent: "main" },
      { firstName: "Omar", lastName: "Hassan", gender: "boy", parent: "main" },
      { firstName: "Zainab", lastName: "Ali", gender: "girl", parent: "other" },
      { firstName: "Yusuf", lastName: "Ali", gender: "boy", parent: "other" },
      { firstName: "Fatima", lastName: "Ali", gender: "girl", parent: "other" },
    ],
  });

  await seedTenant(admin, {
    name: "Al-Huda Islamic School",
    slug: "huda",
    city: "St. Paul",
    welcomeNote: "Assalamu alaikum. Al-Huda families can review attendance, homework, and billing records here.",
    adminName: "Brother Ibrahim",
    teacherName: "Ustadha Khadija",
    parentName: "Nimco Farah",
    otherParentName: "Hodan Warsame",
    students: [
      { firstName: "Adam", lastName: "Farah", gender: "boy", parent: "main" },
      { firstName: "Layla", lastName: "Farah", gender: "girl", parent: "main" },
      { firstName: "Musa", lastName: "Warsame", gender: "boy", parent: "other" },
    ],
  });

  console.log("Seeded staging demo dugsis: noor and huda");
  console.log("Password for every demo account: Dugsi123!");
  console.log("noor admin: admin@noor.dugsi");
  console.log("noor teacher: teacher@noor.dugsi");
  console.log("noor parent: parent@noor.dugsi");
  console.log("huda admin: admin@huda.dugsi");
  console.log("platform: school code platform / platform@dugsi.app");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

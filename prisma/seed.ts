import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "Dugsi123!";

async function seedTenant(input: {
  name: string;
  slug: string;
  city: string;
  welcomeNote: string;
  adminName: string;
  teacherName: string;
  parentName: string;
  otherParentName: string;
  students: Array<{ firstName: string; lastName: string; gender: string; parent: "main" | "other" }>;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      city: input.city,
      email: `admin@${input.slug}.dugsi`,
      phone: "612-555-0100",
      welcomeNote: input.welcomeNote,
      status: "active",
    },
  });

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `admin@${input.slug}.dugsi`,
      name: input.adminName,
      role: "ADMIN",
      passwordHash,
      status: "active",
    },
  });

  const teacher = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `teacher@${input.slug}.dugsi`,
      name: input.teacherName,
      role: "TEACHER",
      passwordHash,
      status: "active",
    },
  });

  const parent = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `parent@${input.slug}.dugsi`,
      name: input.parentName,
      role: "PARENT",
      passwordHash,
      status: "active",
    },
  });

  const otherParent = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `family@${input.slug}.dugsi`,
      name: input.otherParentName,
      role: "PARENT",
      passwordHash,
      status: "active",
    },
  });

  await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      userId: teacher.id,
      name: input.teacherName,
      email: teacher.email,
      title: "Lead Quran Teacher",
      startDate: "2025-09-01",
      salary: 1800,
    },
  });

  const schoolClass = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      name: "Year 2 - Saturday",
      level: "Year 2",
      dayOfWeek: "Saturday",
      startTime: "09:00",
      endTime: "11:00",
      room: "Room B",
      teacherId: teacher.id,
    },
  });

  const createdStudents = [];
  for (const child of input.students) {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        firstName: child.firstName,
        lastName: child.lastName,
        gender: child.gender,
        parentId: child.parent === "main" ? parent.id : otherParent.id,
        classId: schoolClass.id,
        status: "enrolled",
      },
    });
    createdStudents.push(student);
  }

  const today = "2026-10-18";
  for (const student of createdStudents) {
    await prisma.attendance.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        classId: schoolClass.id,
        date: today,
        status: student.firstName === "Zainab" ? "absent" : "present",
        markedById: teacher.id,
      },
    });

    await prisma.quranProgress.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        surah: "Al-Baqarah",
        ayahFrom: 1,
        ayahTo: student.firstName === "Aisha" ? 25 : 15,
        juz: 1,
        date: today,
        recordedById: teacher.id,
        notes: "Steady recitation this week.",
      },
    });
  }

  await prisma.homework.create({
    data: {
      tenantId: tenant.id,
      classId: schoolClass.id,
      title: "Memorize Surah Al-Fatiha review",
      description: "Recite at home with a parent before next Saturday.",
      assignedDate: "2026-10-18",
      dueDate: "2026-10-25",
      assignedById: teacher.id,
    },
  });

  const [first, second, third] = createdStudents;
  await prisma.invoice.createMany({
    data: [
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
    ],
  });

  await prisma.expense.createMany({
    data: [
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
    ],
  });

  return { tenant, admin };
}

async function main() {
  await prisma.emailLog.deleteMany();
  await prisma.homeworkCompletion.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.quranProgress.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  await prisma.user.create({
    data: {
      email: "platform@dugsi.app",
      name: "Platform Operator",
      role: "PLATFORM",
      passwordHash: await bcrypt.hash(PASSWORD, 12),
      status: "active",
    },
  });

  await seedTenant({
    name: "Masjid Al-Noor Weekend Dugsi",
    slug: "noor",
    city: "Minneapolis",
    welcomeNote: "Assalamu alaikum. Welcome to Masjid Al-Noor Weekend Dugsi. Saturday class is 9:00–11:00 AM.",
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

  await seedTenant({
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

  console.log("Seeded two isolated dugsis: noor and huda");
  console.log("Password for every demo account: Dugsi123!");
  console.log("noor admin: admin@noor.dugsi");
  console.log("noor teacher: teacher@noor.dugsi");
  console.log("noor parent: parent@noor.dugsi");
  console.log("huda admin: admin@huda.dugsi");
  console.log("platform: school code platform / platform@dugsi.app");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

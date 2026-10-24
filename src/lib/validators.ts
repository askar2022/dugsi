import { z } from "zod";

export const schoolCodeSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers, and hyphens only.");

export const loginSchema = z.object({
  schoolCode: z.string().min(2),
  email: z.string().min(3),
  password: z.string().min(8),
  portal: z.enum(["parent", "staff", "admin", "teacher"]).optional(),
});

export const registerTenantSchema = z.object({
  dugsiName: z.string().min(3),
  schoolCode: schoolCodeSchema,
  adminName: z.string().min(2),
  email: z.string().min(3),
  password: z.string().min(8),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export const assessmentSchema = z.object({
  readingLevel: z.string().min(1),
  juz: z.number().int().min(1).max(30),
  surah: z.string().min(1),
  ayah: z.number().int().min(1),
  notes: z.string().optional(),
  recommendedClassId: z.string().min(1),
});

export const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  parentEmail: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  classId: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export const parentSchema = z.object({
  name: z.string().min(2),
  email: z.string().min(3),
  phone: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  title: z.string().min(2),
  classId: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  startDate: z.string().optional(),
  salary: z.number().optional(),
  notes: z.string().optional(),
});

export const classSchema = z.object({
  name: z.string().min(2),
  level: z.string().optional(),
  dayOfWeek: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().optional(),
  teacherId: z.string().optional(),
});

export const attendanceSchema = z.object({
  classId: z.string(),
  date: z.string(),
  marks: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["present", "absent", "late", "excused"]),
    }),
  ),
});

export const homeworkSchema = z.object({
  classId: z.string(),
  studentId: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  kind: z.enum(["reading", "memorization", "review", "written"]).default("reading"),
  surah: z.string().min(1),
  ayahFrom: z.coerce.number().int().min(1),
  ayahTo: z.coerce.number().int().min(1),
  juz: z.coerce.number().int().min(1).max(30).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  assignedDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const homeworkCompletionSchema = z.object({
  studentId: z.string(),
  status: z.enum(["done", "needs_help"]),
});

export const progressSchema = z.object({
  studentId: z.string(),
  surah: z.string().min(1),
  ayahFrom: z.number().int().min(1),
  ayahTo: z.number().int().min(1),
  juz: z.number().int().optional(),
  notes: z.string().optional(),
  date: z.string(),
  status: z.enum(["on_track", "needs_practice", "contact_parent"]).default("on_track"),
});

export const invoiceSchema = z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  period: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.enum(["salary", "rent", "equipment", "other"]),
  amount: z.number().positive(),
  date: z.string(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  staffId: z.string().optional(),
});

export const enrollSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

export const publicEnrollSchema = z.object({
  schoolCode: z.string().min(2),
  parentName: z.string().min(2),
  parentEmail: z.string().email(),
  parentPhone: z.string().min(7),
  address: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.coerce.number().int().min(3).max(25),
  gender: z.string().optional(),
  notes: z.string().optional(),
  agreeFeeAndEnroll: z.literal(true),
});

export const publicEnrollFinishSchema = z.object({
  schoolCode: z.string().min(2),
  parentEmail: z.string().email(),
  parentName: z.string().min(2).optional(),
});

export const settingsSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  welcomeNote: z.string().optional(),
  pageColor: z.enum(["green", "navy", "teal", "burgundy", "brown"]).optional(),
});

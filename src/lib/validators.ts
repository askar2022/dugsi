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

export const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().min(2),
  startDate: z.string().optional(),
  salary: z.number().optional(),
  notes: z.string().optional(),
  createLogin: z.boolean().optional(),
  password: z.string().optional(),
  role: z.enum(["TEACHER", "STAFF", "ADMIN"]).optional(),
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
  title: z.string().min(2),
  description: z.string().optional(),
  assignedDate: z.string(),
  dueDate: z.string().optional(),
});

export const progressSchema = z.object({
  studentId: z.string(),
  surah: z.string().min(1),
  ayahFrom: z.number().int().min(1),
  ayahTo: z.number().int().min(1),
  juz: z.number().int().optional(),
  notes: z.string().optional(),
  date: z.string(),
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

export const settingsSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  welcomeNote: z.string().optional(),
});

import { NextRequest } from "next/server";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthedTenant } from "@/lib/supabase/request";

type ApplicationRow = {
  id: string;
  source: "application" | "student";
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  notes: string | null;
  status: string;
};

function guardianFromNotes(notes: string | null) {
  try {
    return notes ? JSON.parse(notes) as {
      guardianName?: string;
      guardianEmail?: string;
      guardianPhone?: string;
      notes?: string;
    } : {};
  } catch {
    return {};
  }
}

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuthedTenant(request, ["ADMIN", "STAFF"]);
    const admin = createAdminClient();
    const applications: ApplicationRow[] = [];

    const { data: rows } = await admin
      .from("EnrollmentApplication")
      .select("*")
      .eq("tenantId", session.tenantId)
      .order("createdAt", { ascending: false });

    for (const item of rows ?? []) {
      applications.push({
        id: item.id,
        source: "application",
        parentName: item.parentName,
        parentEmail: item.parentEmail,
        parentPhone: item.parentPhone,
        firstName: item.firstName,
        lastName: item.lastName,
        dateOfBirth: item.dateOfBirth,
        notes: item.notes,
        status: item.status,
      });
    }

    const { data: pending } = await admin
      .from("Student")
      .select("id, firstName, lastName, dateOfBirth, notes, status, parent:User!parentId(name, email, phone)")
      .eq("tenantId", session.tenantId)
      .eq("status", "pending")
      .order("createdAt", { ascending: false });

    const linkedIds = new Set((rows ?? []).map((item) => item.studentId).filter(Boolean));
    for (const item of pending ?? []) {
      if (linkedIds.has(item.id)) continue;
      const parent = one(item.parent);
      const extra = guardianFromNotes(item.notes);
      applications.push({
        id: item.id,
        source: "student",
        parentName: extra.guardianName ?? parent?.name ?? "—",
        parentEmail: extra.guardianEmail ?? parent?.email ?? "",
        parentPhone: extra.guardianPhone ?? parent?.phone ?? null,
        firstName: item.firstName,
        lastName: item.lastName,
        dateOfBirth: item.dateOfBirth,
        notes: extra.notes ?? (extra.guardianName ? null : item.notes),
        status: item.status,
      });
    }

    return json({
      applications,
      enrollUrl: `/enroll/${session.tenantSlug}`,
      schoolCode: session.tenantSlug,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

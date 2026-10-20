import { NextRequest } from "next/server";
import { ApiError, handleApiError, requireRoles } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN", "STAFF", "TEACHER", "PARENT"]);
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
    });
    if (!tenant) {
      throw new ApiError("School not found.", 404);
    }
    return json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        city: tenant.city,
        welcomeNote: tenant.welcomeNote,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRoles(request, ["ADMIN"]);
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError("Check the school settings and try again.");
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: parsed.data,
    });

    return json({ tenant });
  } catch (err) {
    return handleApiError(err);
  }
}

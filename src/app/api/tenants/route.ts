import { NextRequest } from "next/server";
import { requireSession } from "@/lib/guard";
import { handleApiError } from "@/lib/guard";
import { json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/guard";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (session.role !== "PLATFORM") {
      throw new ApiError("Only the platform operator can list all dugsis.", 403);
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, students: true, classes: true } },
      },
    });

    return json({ tenants });
  } catch (err) {
    return handleApiError(err);
  }
}

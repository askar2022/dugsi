import { cookies } from "next/headers";
import {
  cookieOptions,
  createSessionToken,
  hashPassword,
  normalizeSchoolCode,
  publicUser,
  SESSION_COOKIE,
  toSession,
} from "@/lib/auth";
import { applyCors, error, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { registerTenantSchema } from "@/lib/validators";

export async function OPTIONS() {
  return applyCors(json({ ok: true }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerTenantSchema.safeParse(body);
  if (!parsed.success) {
    return error("Check the school name, school code, and admin details.");
  }

  const slug = normalizeSchoolCode(parsed.data.schoolCode);
  if (!slug || slug === "platform") {
    return error("Choose a different school code.");
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return error("That school code is already in use. Pick another.");
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const email = parsed.data.email.trim().toLowerCase();

  const tenant = await prisma.tenant.create({
    data: {
      name: parsed.data.dugsiName.trim(),
      slug,
      email,
      phone: parsed.data.phone,
      city: parsed.data.city,
      status: "active",
      welcomeNote: `Assalamu alaikum and welcome to ${parsed.data.dugsiName.trim()}.`,
      users: {
        create: {
          email,
          passwordHash,
          name: parsed.data.adminName.trim(),
          role: "ADMIN",
          phone: parsed.data.phone,
          status: "active",
        },
      },
    },
    include: { users: true },
  });

  const admin = tenant.users[0];
  const session = toSession(admin, tenant);
  const token = await createSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions());

  return json({ token, user: publicUser(session), tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } }, 201);
}

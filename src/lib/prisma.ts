import { PrismaClient } from "@prisma/client";
import { requireDatabaseUrl } from "./supabase-env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.APP_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: requireDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

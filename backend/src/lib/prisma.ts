import { PrismaClient } from "./prisma-client";
import { env } from "../config/env";

// Reuse a single client across hot reloads in dev so we don't exhaust the
// Neon connection pool with a new PrismaClient per file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error", "warn"] : ["warn", "error"],
  });

if (!env.isProduction) globalForPrisma.prisma = prisma;

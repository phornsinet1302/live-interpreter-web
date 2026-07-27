import { PrismaClient } from "./prisma-client";

// Cache the client on `global` so `tsx watch` hot-reloads don't spawn a new
// connection pool (and a new Postgres connection) on every file save.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

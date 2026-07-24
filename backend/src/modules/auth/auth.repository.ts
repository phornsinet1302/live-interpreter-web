// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function findUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function createSession(data: Prisma.SessionCreateInput) {
  return prisma.session.create({ data });
}

export function findSessionByToken(refreshToken: string) {
  return prisma.session.findUnique({ where: { refreshToken }, include: { user: true } });
}

export function deleteSessionByToken(refreshToken: string) {
  return prisma.session.deleteMany({ where: { refreshToken } });
}

export function deleteSessionsForUser(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

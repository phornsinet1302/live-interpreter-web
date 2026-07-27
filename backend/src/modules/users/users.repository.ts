import { prisma } from "../../lib/prisma";
import type { UserTheme } from "../../lib/prisma-client";

export function findActiveUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function updateProfile(
  id: string,
  data: { name?: string; preferredLanguage?: string; theme?: UserTheme }
) {
  return prisma.user.update({ where: { id }, data });
}

export function updatePasswordHash(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function updateAvatarUrl(id: string, avatarUrl: string) {
  return prisma.user.update({ where: { id }, data: { avatarUrl } });
}

export function softDelete(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function deleteAllSessionsForUser(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

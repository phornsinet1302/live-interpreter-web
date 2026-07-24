// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function findActiveById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

export function softDeleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function deleteSessionsForUser(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

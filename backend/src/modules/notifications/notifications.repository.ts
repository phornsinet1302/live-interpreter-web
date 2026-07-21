// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export async function listForUser(userId: string, unreadOnly: boolean, skip: number, take: number) {
  const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.notification.count({ where }),
  ]);
  return { items, total };
}

export function findById(userId: string, id: string) {
  return prisma.notification.findFirst({ where: { id, userId } });
}

export function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export function remove(userId: string, id: string) {
  return prisma.notification.deleteMany({ where: { id, userId } });
}

export function create(data: Prisma.NotificationCreateInput) {
  return prisma.notification.create({ data });
}

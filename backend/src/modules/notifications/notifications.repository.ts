import { prisma } from "../../lib/prisma";
import type { NotificationType } from "../../lib/prisma-client";

// Used internally by other modules (e.g. exports, when a file finishes
// processing) — there is no POST /notifications in the given API surface.
export function create(data: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}) {
  return prisma.notification.create({ data });
}

export function findManyByUser(
  userId: string,
  filters: { isRead?: boolean },
  skip: number,
  take: number
) {
  return prisma.notification.findMany({
    where: { userId, ...filters },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export function countByUser(userId: string, filters: { isRead?: boolean }) {
  return prisma.notification.count({ where: { userId, ...filters } });
}

export function findById(userId: string, id: string) {
  return prisma.notification.findFirst({ where: { id, userId } });
}

export function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export function markAllReadForUser(userId: string) {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export function remove(id: string) {
  return prisma.notification.delete({ where: { id } });
}

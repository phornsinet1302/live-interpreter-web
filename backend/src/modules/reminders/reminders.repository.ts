import { prisma } from "../../lib/prisma";

export function create(userId: string, data: { message: string; remindAt: Date }) {
  return prisma.reminder.create({ data: { userId, ...data } });
}

export function findManyByUser(userId: string, skip: number, take: number) {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { remindAt: "asc" },
    skip,
    take,
  });
}

export function countByUser(userId: string) {
  return prisma.reminder.count({ where: { userId } });
}

export function findById(userId: string, id: string) {
  return prisma.reminder.findFirst({ where: { id, userId } });
}

export function remove(id: string) {
  return prisma.reminder.delete({ where: { id } });
}

// Due = past its remindAt and not yet fired — polled by the scheduler
// (see lib/reminder-scheduler.ts).
export function findDue(now: Date) {
  return prisma.reminder.findMany({ where: { remindAt: { lte: now }, firedAt: null } });
}

export function markFired(id: string, firedAt: Date) {
  return prisma.reminder.update({ where: { id }, data: { firedAt } });
}

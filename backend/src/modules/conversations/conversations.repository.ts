import { prisma } from "../../lib/prisma";
import type { ConversationStatus, Prisma } from "../../lib/prisma-client";

export function create(ownerId: string, data: {
  title?: string;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  return prisma.conversation.create({
    data: { ownerId, ...data },
  });
}

export function findById(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

export function findManyByOwner(
  ownerId: string,
  filters: { status?: ConversationStatus },
  skip: number,
  take: number
) {
  const where: Prisma.ConversationWhereInput = { ownerId, ...filters };
  return prisma.conversation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export function countByOwner(ownerId: string, filters: { status?: ConversationStatus }) {
  return prisma.conversation.count({ where: { ownerId, ...filters } });
}

export function update(
  id: string,
  data: { title?: string; sourceLanguage?: string; targetLanguage?: string }
) {
  return prisma.conversation.update({ where: { id }, data });
}

export function updateStatus(id: string, status: ConversationStatus) {
  return prisma.conversation.update({ where: { id }, data: { status } });
}

export function remove(id: string) {
  return prisma.conversation.delete({ where: { id } });
}

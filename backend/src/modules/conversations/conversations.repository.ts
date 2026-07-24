// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { ConversationStatus, Prisma } from "../../lib/prisma-client";

export function createConversation(data: Prisma.ConversationCreateInput) {
  return prisma.conversation.create({ data });
}

export function findById(id: string) {
  return prisma.conversation.findUnique({ where: { id } });
}

export async function listByOwner(
  ownerId: string,
  where: Prisma.ConversationWhereInput,
  skip: number,
  take: number
) {
  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { ownerId, ...where },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.conversation.count({ where: { ownerId, ...where } }),
  ]);
  return { items, total };
}

export function updateConversation(id: string, data: Prisma.ConversationUpdateInput) {
  return prisma.conversation.update({ where: { id }, data });
}

export function updateStatus(
  id: string,
  status: ConversationStatus,
  timestamps: { startedAt?: Date; endedAt?: Date }
) {
  return prisma.conversation.update({ where: { id }, data: { status, ...timestamps } });
}

export function deleteConversation(id: string) {
  return prisma.conversation.delete({ where: { id } });
}

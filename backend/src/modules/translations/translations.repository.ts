// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function createMessage(data: Prisma.ConversationMessageCreateInput) {
  return prisma.conversationMessage.create({ data, include: { speaker: true } });
}

export async function listByConversation(conversationId: string, skip: number, take: number) {
  const where = { conversationId };
  const [items, total] = await Promise.all([
    prisma.conversationMessage.findMany({
      where,
      include: { speaker: true },
      orderBy: { createdAt: "asc" },
      skip,
      take,
    }),
    prisma.conversationMessage.count({ where }),
  ]);
  return { items, total };
}

export function findById(conversationId: string, messageId: string) {
  return prisma.conversationMessage.findFirst({
    where: { id: messageId, conversationId },
    include: { speaker: true },
  });
}

export function deleteMessage(conversationId: string, messageId: string) {
  return prisma.conversationMessage.deleteMany({ where: { id: messageId, conversationId } });
}

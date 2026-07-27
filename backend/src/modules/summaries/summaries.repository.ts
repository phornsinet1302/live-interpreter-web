import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function findMessagesForConversation(conversationId: string) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { originalText: true, translatedText: true },
  });
}

export function upsert(
  conversationId: string,
  data: {
    summary: string;
    keyPoints: Prisma.InputJsonValue;
    actionItems: Prisma.InputJsonValue;
    keywords: Prisma.InputJsonValue;
  }
) {
  return prisma.summary.upsert({
    where: { conversationId },
    create: { conversationId, ...data },
    update: { ...data, generatedAt: new Date() },
  });
}

export function findByConversation(conversationId: string) {
  return prisma.summary.findUnique({ where: { conversationId } });
}

export function remove(conversationId: string) {
  return prisma.summary.deleteMany({ where: { conversationId } });
}

import { prisma } from "../../lib/prisma";

export function create(data: {
  conversationId: string;
  speakerId?: string | null;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translationProvider: string;
  confidence: number | null;
}) {
  return prisma.conversationMessage.create({ data });
}

export function findManyByConversation(conversationId: string, skip: number, take: number) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    skip,
    take,
  });
}

export function countByConversation(conversationId: string) {
  return prisma.conversationMessage.count({ where: { conversationId } });
}

export function findById(conversationId: string, messageId: string) {
  return prisma.conversationMessage.findFirst({
    where: { id: messageId, conversationId },
  });
}

export function remove(messageId: string) {
  return prisma.conversationMessage.delete({ where: { id: messageId } });
}

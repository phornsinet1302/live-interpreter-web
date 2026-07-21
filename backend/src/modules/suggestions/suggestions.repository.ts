// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { SuggestionPriority } from "../../lib/prisma-client";

export function listTranscript(conversationId: string) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { originalText: true, translatedText: true },
  });
}

export function deleteAllForConversation(conversationId: string) {
  return prisma.suggestedAction.deleteMany({ where: { conversationId } });
}

export function createMany(
  conversationId: string,
  suggestions: { suggestion: string; priority: SuggestionPriority }[]
) {
  return prisma.suggestedAction.createMany({
    data: suggestions.map((s) => ({ ...s, conversationId })),
  });
}

export function listByConversation(conversationId: string) {
  return prisma.suggestedAction.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
  });
}

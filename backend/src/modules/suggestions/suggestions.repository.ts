import { prisma } from "../../lib/prisma";
import type { SuggestionPriority } from "../../lib/prisma-client";

export function findMessagesForConversation(conversationId: string) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { originalText: true, translatedText: true },
  });
}

export function createMany(
  conversationId: string,
  suggestions: { suggestion: string; priority: SuggestionPriority }[]
) {
  return prisma.suggestedAction.createMany({
    data: suggestions.map((s) => ({ conversationId, ...s })),
  });
}

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function findManyByConversation(conversationId: string) {
  const rows = await prisma.suggestedAction.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
  });
  return rows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

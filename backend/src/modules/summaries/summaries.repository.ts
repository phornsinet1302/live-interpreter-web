// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function findByConversation(conversationId: string) {
  return prisma.summary.findUnique({ where: { conversationId } });
}

export function listTranscript(conversationId: string) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { originalText: true, translatedText: true },
  });
}

export function upsertSummary(
  conversationId: string,
  data: Omit<Prisma.SummaryCreateInput, "conversation">
) {
  return prisma.summary.upsert({
    where: { conversationId },
    create: { conversation: { connect: { id: conversationId } }, ...data },
    update: data,
  });
}

export function deleteSummary(conversationId: string) {
  return prisma.summary.deleteMany({ where: { conversationId } });
}

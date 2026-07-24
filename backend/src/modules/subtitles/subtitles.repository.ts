// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function findByConversation(conversationId: string) {
  return prisma.subtitleSession.findUnique({ where: { conversationId } });
}

export function create(data: Prisma.SubtitleSessionCreateInput) {
  return prisma.subtitleSession.create({ data });
}

export function update(conversationId: string, data: Prisma.SubtitleSessionUpdateInput) {
  return prisma.subtitleSession.update({ where: { conversationId }, data });
}

export function remove(conversationId: string) {
  return prisma.subtitleSession.deleteMany({ where: { conversationId } });
}

import { prisma } from "../../lib/prisma";
import type { SubtitleStatus } from "../../lib/prisma-client";

export function deactivateAllForConversation(conversationId: string) {
  return prisma.subtitleSession.updateMany({
    where: { conversationId, status: "active" },
    data: { status: "inactive" },
  });
}

export function create(
  conversationId: string,
  sessionCode: string,
  data: { fontSize?: number; fontColor?: string; backgroundColor?: string }
) {
  return prisma.subtitleSession.create({
    data: { conversationId, sessionCode, ...data },
  });
}

export function findLatestByConversation(conversationId: string) {
  return prisma.subtitleSession.findFirst({
    where: { conversationId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function findById(conversationId: string, id: string) {
  return prisma.subtitleSession.findFirst({ where: { id, conversationId } });
}

export function update(
  id: string,
  data: {
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    status?: SubtitleStatus;
  }
) {
  return prisma.subtitleSession.update({ where: { id }, data });
}

export function remove(id: string) {
  return prisma.subtitleSession.delete({ where: { id } });
}

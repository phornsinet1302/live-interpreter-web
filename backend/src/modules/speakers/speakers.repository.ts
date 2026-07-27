import { prisma } from "../../lib/prisma";

export function create(conversationId: string, data: { label: string; displayName?: string }) {
  return prisma.speaker.create({ data: { conversationId, ...data } });
}

export function findManyByConversation(conversationId: string) {
  return prisma.speaker.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export function findById(conversationId: string, speakerId: string) {
  return prisma.speaker.findFirst({ where: { id: speakerId, conversationId } });
}

export function update(speakerId: string, data: { label?: string; displayName?: string }) {
  return prisma.speaker.update({ where: { id: speakerId }, data });
}

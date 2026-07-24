// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-client";

export function createSpeaker(data: Prisma.SpeakerCreateInput) {
  return prisma.speaker.create({ data });
}

export function listByConversation(conversationId: string) {
  return prisma.speaker.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
}

export function findById(conversationId: string, speakerId: string) {
  return prisma.speaker.findFirst({ where: { id: speakerId, conversationId } });
}

export function updateSpeaker(speakerId: string, data: Prisma.SpeakerUpdateInput) {
  return prisma.speaker.update({ where: { id: speakerId }, data });
}

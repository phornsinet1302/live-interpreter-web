import { prisma } from "../../lib/prisma";

// Every read below except findManyWithReference explicitly selects away
// referenceAudio/referenceAudioMimeType — those can be sizeable base64 blobs
// and are purely an internal voice-matching implementation detail, never
// meant to reach a client response.
const PUBLIC_SELECT = {
  id: true,
  conversationId: true,
  label: true,
  displayName: true,
  confidence: true,
  createdAt: true,
} as const;

export function create(conversationId: string, data: { label: string; displayName?: string }) {
  return prisma.speaker.create({ data: { conversationId, ...data }, select: PUBLIC_SELECT });
}

export function findManyByConversation(conversationId: string) {
  return prisma.speaker.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: PUBLIC_SELECT,
  });
}

export function findById(conversationId: string, speakerId: string) {
  return prisma.speaker.findFirst({ where: { id: speakerId, conversationId }, select: PUBLIC_SELECT });
}

export function update(speakerId: string, data: { label?: string; displayName?: string }) {
  return prisma.speaker.update({ where: { id: speakerId }, data, select: PUBLIC_SELECT });
}

// Only the speakers that have a reference clip are candidates for voice
// matching — one could exist without one if it was created manually via the
// plain create() above rather than through identifySpeaker.
export function findManyWithReference(conversationId: string) {
  return prisma.speaker.findMany({
    where: { conversationId, referenceAudio: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, displayName: true, referenceAudio: true, referenceAudioMimeType: true },
  });
}

export function createWithReference(
  conversationId: string,
  data: { label: string; referenceAudio: string; referenceAudioMimeType: string }
) {
  return prisma.speaker.create({ data: { conversationId, ...data }, select: PUBLIC_SELECT });
}

// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";
import type { ExportStatus, Prisma } from "../../lib/prisma-client";

export function create(data: Prisma.ExportCreateInput) {
  return prisma.export.create({ data });
}

export function findById(id: string) {
  return prisma.export.findUnique({ where: { id } });
}

export function updateStatus(id: string, status: ExportStatus, fileUrl?: string) {
  return prisma.export.update({ where: { id }, data: { status, fileUrl } });
}

export function remove(id: string) {
  return prisma.export.delete({ where: { id } });
}

export function listTranscript(conversationId: string) {
  return prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { speaker: true },
  });
}

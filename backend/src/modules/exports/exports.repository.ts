import { prisma } from "../../lib/prisma";
import type { ExportStatus, ExportType } from "../../lib/prisma-client";

export function create(conversationId: string, userId: string, type: ExportType) {
  return prisma.export.create({ data: { conversationId, userId, type } });
}

export function findById(id: string) {
  return prisma.export.findUnique({ where: { id } });
}

export function updateStatus(id: string, status: ExportStatus, fileUrl?: string | null) {
  return prisma.export.update({ where: { id }, data: { status, fileUrl } });
}

export function remove(id: string) {
  return prisma.export.delete({ where: { id } });
}

export function getExportBundle(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      speakers: true,
      summary: true,
    },
  });
}

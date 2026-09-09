import { prisma } from "../../lib/prisma";
import type { UserTheme } from "../../lib/prisma-client";

export function findActiveUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function updateProfile(
  id: string,
  data: {
    name?: string;
    preferredLanguage?: string;
    theme?: UserTheme;
    notifyExportCompleted?: boolean;
    notifyTranslationCompleted?: boolean;
    notifySystemUpdates?: boolean;
    notifyReminders?: boolean;
  }
) {
  return prisma.user.update({ where: { id }, data });
}

export function updateAvatarUrl(id: string, avatarUrl: string) {
  return prisma.user.update({ where: { id }, data: { avatarUrl } });
}

export function softDelete(id: string) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
}

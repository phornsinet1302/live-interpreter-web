import path from "node:path";
import { unlink } from "node:fs/promises";
import * as repo from "./users.repository";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import { recordAuditLog } from "../../utils/audit-log";
import type { User, UserTheme } from "../../lib/prisma-client";
import type { PublicUser, UpdateProfileInput } from "./users.types";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    preferredLanguage: user.preferredLanguage,
    theme: user.theme,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    notifyExportCompleted: user.notifyExportCompleted,
    notifyTranslationCompleted: user.notifyTranslationCompleted,
    notifySystemUpdates: user.notifySystemUpdates,
    notifyReminders: user.notifyReminders,
  };
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await repo.findActiveUserById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return toPublicUser(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  const user = await repo.updateProfile(userId, {
    name: input.name,
    preferredLanguage: input.preferredLanguage,
    theme: input.theme as UserTheme | undefined,
    notifyExportCompleted: input.notifyExportCompleted,
    notifyTranslationCompleted: input.notifyTranslationCompleted,
    notifySystemUpdates: input.notifySystemUpdates,
    notifyReminders: input.notifyReminders,
  });
  return toPublicUser(user);
}

export async function updateAvatar(
  userId: string,
  file: { filename: string }
): Promise<PublicUser> {
  const current = await repo.findActiveUserById(userId);
  if (!current) throw ApiError.notFound("User not found");

  if (current.avatarUrl) {
    const oldPath = path.join(env.uploadsDir, "avatars", path.basename(current.avatarUrl));
    unlink(oldPath).catch((error) => logger.warn("Failed to remove old avatar", error));
  }

  const avatarUrl = `/uploads/avatars/${file.filename}`;
  const user = await repo.updateAvatarUrl(userId, avatarUrl);
  return toPublicUser(user);
}

export async function deleteAccount(userId: string) {
  await repo.softDelete(userId);
  await recordAuditLog({ userId, action: "delete_account", resource: "users" });
}

import * as repo from "./users.repository";
import { uploadAvatar } from "../../lib/cloudinary";
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

export async function updateAvatar(userId: string, fileBuffer: Buffer): Promise<PublicUser> {
  const current = await repo.findActiveUserById(userId);
  if (!current) throw ApiError.notFound("User not found");

  // Deterministic public_id (see lib/cloudinary.ts) means this overwrites
  // the user's existing avatar in place — no separate delete-the-old-one step.
  const avatarUrl = await uploadAvatar(userId, fileBuffer);
  const user = await repo.updateAvatarUrl(userId, avatarUrl);
  return toPublicUser(user);
}

export async function deleteAccount(userId: string) {
  await repo.softDelete(userId);
  await recordAuditLog({ userId, action: "delete_account", resource: "users" });
}

export async function updatePushToken(userId: string, token: string | null): Promise<void> {
  await repo.updatePushToken(userId, token);
}

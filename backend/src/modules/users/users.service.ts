// Service -> business rules & orchestration. Calls repository + lib (bcrypt). No req/res.
import { comparePassword, hashPassword } from "../../lib/bcrypt";
import { AppError } from "../../utils/app-error";
import { toPublicUser } from "../../utils/serialize";
import * as repo from "./users.repository";
import type { UpdateAvatarInput, UpdatePasswordInput, UpdateProfileInput } from "./users.validator";

async function requireActiveUser(userId: string) {
  const user = await repo.findActiveById(userId);
  if (!user) throw AppError.notFound("User not found");
  return user;
}

export async function getMe(userId: string) {
  return toPublicUser(await requireActiveUser(userId));
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await requireActiveUser(userId);
  const user = await repo.updateUser(userId, input);
  return toPublicUser(user);
}

export async function updateAvatar(userId: string, input: UpdateAvatarInput) {
  await requireActiveUser(userId);
  const user = await repo.updateUser(userId, { avatarUrl: input.avatarUrl });
  return toPublicUser(user);
}

export async function updatePassword(userId: string, input: UpdatePasswordInput) {
  const user = await requireActiveUser(userId);

  if (user.passwordHash) {
    if (!input.currentPassword) {
      throw AppError.badRequest("currentPassword is required to change your password");
    }
    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Current password is incorrect");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await repo.updateUser(userId, { passwordHash });
  // Force re-login on every other device once the password changes.
  await repo.deleteSessionsForUser(userId);
}

export async function deleteMe(userId: string) {
  await requireActiveUser(userId);
  await repo.softDeleteUser(userId);
  await repo.deleteSessionsForUser(userId);
}

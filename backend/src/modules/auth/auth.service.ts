// Service -> business rules & orchestration. Calls repository + lib (jwt, bcrypt). No req/res.
import { comparePassword, hashPassword } from "../../lib/bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
} from "../../lib/jwt";
import { verifyGoogleIdToken } from "../../lib/google";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { toPublicUser } from "../../utils/serialize";
import * as repo from "./auth.repository";
import { REFRESH_TOKEN_TTL_MS } from "./auth.constants";
import type {
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validator";
import type { AuthResult, AuthTokens, RequestMeta } from "./auth.types";
import type { User } from "../../lib/prisma-client";

async function issueTokens(user: User, meta: RequestMeta): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  await repo.createSession({
    user: { connect: { id: user.id } },
    refreshToken,
    deviceName: meta.userAgent?.slice(0, 255),
    deviceType: meta.userAgent?.includes("Mobile") ? "mobile" : "desktop",
    ipAddress: meta.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
  const existing = await repo.findUserByEmail(input.email);
  if (existing) throw AppError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    preferredLanguage: input.preferredLanguage ?? "en",
  });

  const tokens = await issueTokens(user, meta);
  return { ...tokens, user: toPublicUser(user) };
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
  const user = await repo.findUserByEmail(input.email);
  if (!user || user.deletedAt || !user.passwordHash) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Invalid email or password");

  const tokens = await issueTokens(user, meta);
  return { ...tokens, user: toPublicUser(user) };
}

export async function loginWithGoogle(
  input: GoogleAuthInput,
  meta: RequestMeta
): Promise<AuthResult> {
  const profile = await verifyGoogleIdToken(input.idToken);

  let user = await repo.findUserByGoogleId(profile.googleId);
  if (!user) {
    const byEmail = await repo.findUserByEmail(profile.email);
    user = byEmail
      ? byEmail
      : await repo.createUser({
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
          isVerified: true,
        });
  }

  if (user.deletedAt) throw AppError.unauthorized("This account has been deactivated");

  const tokens = await issueTokens(user, meta);
  return { ...tokens, user: toPublicUser(user) };
}

export async function refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const session = await repo.findSessionByToken(refreshToken);
  if (!session || session.expiresAt < new Date()) {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  // Rotate: the old refresh token is single-use.
  await repo.deleteSessionByToken(refreshToken);
  return issueTokens(session.user, meta);
}

export async function logout(refreshToken: string): Promise<void> {
  await repo.deleteSessionByToken(refreshToken);
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ resetToken?: string }> {
  const user = await repo.findUserByEmail(input.email);
  // Always respond success so this endpoint can't be used to enumerate emails.
  if (!user || user.deletedAt) return {};

  const resetToken = signPasswordResetToken(user.id);
  // TODO: send resetToken via email once an email provider is wired up.
  // Surfaced directly in non-production so the flow is testable end-to-end.
  return env.isProduction ? {} : { resetToken };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  let userId: string;
  try {
    userId = verifyPasswordResetToken(input.token).sub;
  } catch {
    throw AppError.unauthorized("Invalid or expired reset token");
  }

  const user = await repo.findUserById(userId);
  if (!user) throw AppError.unauthorized("Invalid or expired reset token");

  const passwordHash = await hashPassword(input.password);
  await repo.updateUserPassword(user.id, passwordHash);
  // Force re-login everywhere — the old password is no longer valid.
  await repo.deleteSessionsForUser(user.id);
}

export async function getMe(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw AppError.notFound("User not found");
  return toPublicUser(user);
}

// Service -> business rules & orchestration. Calls repository + lib (jwt, bcrypt). No req/res.
import { randomUUID, randomInt, createHash } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import * as repo from "./auth.repository";
import * as hashLib from "../../lib/bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from "../../lib/jwt";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { sendPasswordResetEmail, sendVerificationCodeEmail } from "../../lib/email";
import { ApiError } from "../../utils/api-error";
import { recordAuditLog } from "../../utils/audit-log";
import type {
  AuthTokens,
  DeviceContext,
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "./auth.types";
import type { User } from "../../lib/prisma-client";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function issueVerificationCode(user: User): Promise<void> {
  const code = generateVerificationCode();
  const now = new Date();
  await repo.setVerificationCode(user.id, {
    code,
    expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
    sentAt: now,
  });

  await sendVerificationCodeEmail(user.email, code);
  // Also logged (dev only) so the code is easy to find without an inbox.
  if (!env.isProduction) logger.info(`Verification code for ${user.email}`, { code });
}

function decodeExpiry(token: string): Date {
  const decoded = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8")
  ) as { exp: number };
  return new Date(decoded.exp * 1000);
}

async function issueTokens(user: User, device: DeviceContext): Promise<AuthTokens> {
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, sid: sessionId });
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  await repo.createSession({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    ipAddress: device.ipAddress,
    deviceType: device.userAgent ? device.userAgent.slice(0, 50) : null,
    expiresAt: decodeExpiry(refreshToken),
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput, _device: DeviceContext) {
  const existing = await repo.findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await hashLib.hash(input.password);
  const user = await repo.createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    preferredLanguage: input.preferredLanguage,
  });

  await issueVerificationCode(user);
  await recordAuditLog({ userId: user.id, action: "register", resource: "users" });
  // No tokens: the account can't log in until /auth/verify-email succeeds.
  return { user };
}

export async function login(input: LoginInput, device: DeviceContext) {
  const user = await repo.findUserByEmail(input.email);
  if (!user || user.deletedAt || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await hashLib.compare(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isVerified) {
    throw ApiError.forbidden("Please verify your email before logging in.");
  }

  const tokens = await issueTokens(user, device);
  await recordAuditLog({ userId: user.id, action: "login", resource: "users" });
  return { user, tokens };
}

export async function loginWithGoogle(input: GoogleLoginInput, device: DeviceContext) {
  if (!googleClient) {
    throw ApiError.badRequest("Google sign-in is not configured");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized("Invalid Google credential");
  }

  if (!payload?.sub || !payload.email) {
    throw ApiError.unauthorized("Invalid Google credential");
  }

  let user = await repo.findUserByGoogleId(payload.sub);
  if (!user) {
    user = await repo.findUserByEmail(payload.email);
  }
  if (!user) {
    user = await repo.createUser({
      name: payload.name ?? payload.email.split("@")[0],
      email: payload.email,
      googleId: payload.sub,
      isVerified: payload.email_verified ?? false,
    });
  } else if (user.deletedAt) {
    throw ApiError.unauthorized("Account no longer exists");
  }

  const tokens = await issueTokens(user, device);
  await recordAuditLog({ userId: user.id, action: "google_login", resource: "users" });
  return { user, tokens };
}

export async function refresh(input: RefreshInput, device: DeviceContext) {
  let payload;
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const session = await repo.findSessionById(payload.sid);
  if (!session || session.refreshToken !== hashToken(input.refreshToken)) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
  if (session.expiresAt < new Date()) {
    await repo.deleteSessionById(session.id);
    throw ApiError.unauthorized("Refresh token expired");
  }

  const user = await repo.findActiveUserById(payload.sub);
  if (!user) {
    await repo.deleteSessionById(session.id);
    throw ApiError.unauthorized("Account no longer exists");
  }

  // Rotate: the old session row is retired and a brand new one issued.
  await repo.deleteSessionById(session.id);
  return issueTokens(user, device);
}

export async function logout(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await repo.deleteSessionById(payload.sid);
  } catch {
    // Already invalid/expired — logging out is a no-op, not an error.
  }
}

export async function forgotPassword({ email }: ForgotPasswordInput) {
  const user = await repo.findUserByEmail(email);
  // Never reveal whether an account exists.
  if (!user || user.deletedAt) {
    return;
  }

  const token = signPasswordResetToken({ sub: user.id });
  await recordAuditLog({ userId: user.id, action: "forgot_password_request", resource: "users" });

  await sendPasswordResetEmail(user.email, token);
  if (!env.isProduction) logger.info(`Password reset token for ${email}`, { resetToken: token });

  return env.isProduction ? undefined : token;
}

export async function resetPassword(token: string, newPassword: string) {
  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  const user = await repo.findActiveUserById(payload.sub);
  if (!user) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  const passwordHash = await hashLib.hash(newPassword);
  await repo.updateUserPasswordHash(user.id, passwordHash);
  // Invalidate every existing session — cheap, meaningfully more secure.
  await repo.deleteAllSessionsForUser(user.id);
  await recordAuditLog({ userId: user.id, action: "reset_password", resource: "users" });
}

export async function verifyEmail(email: string, code: string) {
  const user = await repo.findUserByEmail(email);
  if (!user || user.deletedAt) {
    throw ApiError.flat(404, "Account not found.");
  }
  if (user.isVerified) {
    throw ApiError.flat(409, "Email is already verified.");
  }
  if (!user.verificationCode || user.verificationCode !== code) {
    throw ApiError.flat(400, "Invalid verification code.");
  }
  if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
    throw ApiError.flat(400, "Verification code has expired.");
  }

  await repo.markEmailVerified(user.id);
  await recordAuditLog({ userId: user.id, action: "verify_email", resource: "users" });
}

export async function resendVerificationCode(email: string) {
  const user = await repo.findUserByEmail(email);
  if (!user || user.deletedAt) {
    throw ApiError.flat(404, "Account not found.");
  }
  if (user.isVerified) {
    throw ApiError.flat(400, "Invalid request or email already verified.");
  }
  if (
    user.verificationCodeSentAt &&
    Date.now() - user.verificationCodeSentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    throw ApiError.flat(429, "Too many resend requests.");
  }

  await issueVerificationCode(user);
}

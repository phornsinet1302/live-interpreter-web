import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "./prisma-client";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
}

export interface PasswordResetTokenPayload {
  sub: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function signPasswordResetToken(
  payload: PasswordResetTokenPayload
): string {
  return jwt.sign(payload, env.passwordReset.secret, {
    expiresIn: env.passwordReset.expiry,
  } as jwt.SignOptions);
}

export function verifyPasswordResetToken(
  token: string
): PasswordResetTokenPayload {
  return jwt.verify(token, env.passwordReset.secret) as PasswordResetTokenPayload;
}

import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

export interface PasswordResetPayload {
  sub: string;
  purpose: "password-reset";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  } as SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function signPasswordResetToken(userId: string): string {
  const payload: PasswordResetPayload = { sub: userId, purpose: "password-reset" };
  return jwt.sign(payload, env.passwordReset.secret, {
    expiresIn: env.passwordReset.expiry,
  } as SignOptions);
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload {
  const payload = jwt.verify(token, env.passwordReset.secret) as PasswordResetPayload;
  if (payload.purpose !== "password-reset") throw new Error("Invalid token purpose");
  return payload;
}

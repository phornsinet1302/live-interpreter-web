// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } });
}

export function findActiveUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  preferredLanguage?: string;
  isVerified?: boolean;
}) {
  return prisma.user.create({ data });
}

export function updateUserPasswordHash(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function setVerificationCode(
  userId: string,
  data: { code: string; expiresAt: Date; sentAt: Date }
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      verificationCode: data.code,
      verificationCodeExpiresAt: data.expiresAt,
      verificationCodeSentAt: data.sentAt,
    },
  });
}

export function markEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verificationCode: null,
      verificationCodeExpiresAt: null,
      verificationCodeSentAt: null,
    },
  });
}

export function createSession(data: {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceName?: string | null;
  deviceType?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}) {
  return prisma.session.create({
    data: {
      id: data.id,
      userId: data.userId,
      refreshToken: data.refreshTokenHash,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      ipAddress: data.ipAddress,
      expiresAt: data.expiresAt,
    },
  });
}

export function findSessionById(id: string) {
  return prisma.session.findUnique({ where: { id } });
}

export function deleteSessionById(id: string) {
  return prisma.session.deleteMany({ where: { id } });
}

export function deleteAllSessionsForUser(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

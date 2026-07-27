import type { Request } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

interface RecordAuditLogInput {
  userId?: string | null;
  action: string;
  resource: string;
  req?: Request;
}

// Explicit, semantic call sites (register/login/logout/password-reset/account
// delete) rather than generic per-request middleware, since only the caller
// knows what "action" actually happened. Never throws — an audit-log failure
// must not break the request it's describing.
export async function recordAuditLog({
  userId,
  action,
  resource,
  req,
}: RecordAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        resource,
        ipAddress: req?.ip ?? null,
        userAgent: req?.headers["user-agent"] ?? null,
      },
    });
  } catch (error) {
    logger.error("Failed to record audit log", { action, resource, error });
  }
}

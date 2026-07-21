import type { Request } from "express";
import { prisma } from "./prisma";
import { logger } from "./logger";

// Best-effort audit trail for sensitive actions (login, password change,
// account deletion, ...). Never throws — an audit-log failure must not fail
// the request it's describing.
export function recordAudit(
  req: Request,
  action: string,
  resource: string,
  userId?: string
) {
  prisma.auditLog
    .create({
      data: {
        userId: userId ?? req.user?.sub,
        action,
        resource,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    })
    .catch((err) => logger.error("Failed to write audit log", { action, error: String(err) }));
}

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

// Backs GET /analytics/api-usage. Fire-and-forget: never awaited by the
// request, errors are swallowed+logged so this can never break a response.
export function apiUsageLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    prisma.apiUsageLog
      .create({
        data: {
          userId: req.user?.id ?? null,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: Date.now() - start,
        },
      })
      .catch((error) => {
        logger.error("Failed to record api usage log", error);
      });
  });

  next();
}

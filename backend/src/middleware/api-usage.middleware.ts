import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

// Fire-and-forget request logging that feeds GET /analytics/api-usage.
// Runs after the response is flushed so it never adds latency to the request.
export function apiUsageMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on("finish", () => {
    prisma.apiUsageLog
      .create({
        data: {
          userId: req.user?.sub,
          endpoint: req.baseUrl + req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: Date.now() - startedAt,
        },
      })
      .catch((err) => logger.error("Failed to write api usage log", { error: String(err) }));
  });

  next();
}

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../lib/prisma-client";
import { ApiError } from "../utils/api-error";
import { logger } from "../lib/logger";

// Express 5 auto-forwards thrown/rejected errors from async route handlers
// here — controllers/services don't need manual try/catch.
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    if (err.flat) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    return;
  }

  if (err instanceof ZodError) {
    // TEMP DEBUG — remove once the intermittent /transcribe 400s are diagnosed.
    if (req.originalUrl.includes("/transcribe")) {
      const body = req.body as Record<string, unknown>;
      const safeBody = {
        ...body,
        audio: typeof body?.audio === "string" ? `<len=${body.audio.length}>` : body?.audio,
      };
      logger.error("DEBUG /transcribe validation failure", {
        body: safeBody,
        issues: err.issues,
      });
    }
    res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        error: { message: "A record with this value already exists", code: "CONFLICT" },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { message: "Record not found", code: "NOT_FOUND" } });
      return;
    }
  }

  logger.error("Unhandled error", err);
  res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } });
}

// Central error handler -> every thrown/rejected error in a route ends up
// here via asyncHandler. Nothing else in the app should call res.status()
// for an error case.
import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../lib/prisma-client";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";
import { logger } from "../lib/logger";

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: err.flatten(),
    });
  }

  // express.json() throws this when the request body isn't valid JSON
  // (e.g. a missing quote/brace) — a client mistake, not a server error.
  if (err instanceof SyntaxError && "status" in err && (err as { status?: number }).status === 400 && "body" in err) {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${(err.meta?.target as string[] | undefined)?.join(", ") ?? "value"} already exists`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
  }

  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err instanceof Error ? err.stack ?? err.message : String(err),
  });

  return res.status(500).json({ success: false, message: "Internal server error" });
}

import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../lib/prisma-client";
import { ApiError } from "../utils/api-error";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden("Insufficient permissions");
    }
    next();
  };
}

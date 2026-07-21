import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

// Use after requireAuth. Restricts a route to specific roles, e.g.
// router.get("/", requireAuth, requireRole("admin"), controller.list)
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

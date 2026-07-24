import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { AppError } from "../utils/app-error";

// Reads the Bearer access token, verifies it, and attaches { sub, role } to
// req.user. Downstream handlers read req.user.sub for the current user id.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  next();
}

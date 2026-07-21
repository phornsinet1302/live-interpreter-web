import type { Request } from "express";
import { AppError } from "./app-error";

// @types/express 5 types req.params values as `string | string[]` (to allow
// splat routes like "/files/*path"). None of our routes use splats, so every
// named param is always a single string — this narrows it back for callers.
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") throw AppError.badRequest(`Missing route parameter: ${name}`);
  return value;
}

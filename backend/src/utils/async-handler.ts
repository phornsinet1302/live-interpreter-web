import type { NextFunction, Request, RequestHandler, Response } from "express";

// Wraps an async controller so a rejected promise reaches the error
// middleware instead of crashing the process with an unhandled rejection.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

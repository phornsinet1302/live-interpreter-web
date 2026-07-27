import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 5's `req.query` is a getter-only accessor — a plain assignment
    // silently no-ops (non-strict setter semantics) instead of throwing, so
    // the parsed/coerced/defaulted Zod values would never actually reach the
    // controller. Redefining the property replaces the getter outright.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      (req as Record<Source, unknown>)[source] = result.data;
    }
    next();
  };
}

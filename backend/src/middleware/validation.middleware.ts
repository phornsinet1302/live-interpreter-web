import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

// Parses req[source] against a Zod schema and replaces it with the parsed
// (typed, defaulted, coerced) value. Throws ZodError on failure, which the
// error middleware turns into a 400.
//
// Express 5 defines `req.query` as a getter-only accessor, so a plain
// `req.query = parsed` throws under ESM strict mode. Object.defineProperty
// overrides it on this request instance instead.
export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]);
    if (source === "query") {
      Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
    } else {
      req[source] = parsed;
    }
    next();
  };
}

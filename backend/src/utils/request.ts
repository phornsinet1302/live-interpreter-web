import type { Request } from "express";

// Express 5's ParamsDictionary types every value as `string | string[]` (to
// support repeated route-param segments), even though none of this API's
// routes actually repeat a param. This narrows it back to a single string.
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

import type { Response } from "express";

// Every successful response shares one envelope shape so frontend clients
// can rely on `data` (and optional `meta`) always being in the same place.
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number }
) {
  return res.status(200).json({
    success: true,
    data,
    meta: { ...meta, totalPages: Math.ceil(meta.total / meta.limit) || 0 },
  });
}

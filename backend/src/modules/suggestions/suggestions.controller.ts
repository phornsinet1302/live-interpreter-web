// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import * as service from "./suggestions.service";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const suggestions = await service.generate(requireParam(req, "conversationId"), currentUser(req));
  return ok(res, suggestions, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.list(requireParam(req, "conversationId"), currentUser(req)));
});

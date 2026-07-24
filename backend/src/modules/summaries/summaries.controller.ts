// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { noContent, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import * as service from "./summaries.service";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const summary = await service.generate(requireParam(req, "conversationId"), currentUser(req));
  return ok(res, summary, 201);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.get(requireParam(req, "conversationId"), currentUser(req)));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(requireParam(req, "conversationId"), currentUser(req));
  return noContent(res);
});

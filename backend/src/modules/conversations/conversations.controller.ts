// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, noContent, ok, paginated } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import * as service from "./conversations.service";
import type {
  CreateConversationInput,
  ListConversationsInput,
  UpdateConversationInput,
} from "./conversations.validator";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await service.create(currentUser(req).sub, req.body as CreateConversationInput);
  return created(res, conversation);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await service.list(currentUser(req), req.query as ListConversationsInput);
  return paginated(res, items, meta);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await service.getById(requireParam(req, "id"), currentUser(req));
  return ok(res, conversation);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await service.update(
    requireParam(req, "id"),
    currentUser(req),
    req.body as UpdateConversationInput
  );
  return ok(res, conversation);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(requireParam(req, "id"), currentUser(req));
  return noContent(res);
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.transition(requireParam(req, "id"), currentUser(req), "start"));
});

export const pause = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.transition(requireParam(req, "id"), currentUser(req), "pause"));
});

export const resume = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.transition(requireParam(req, "id"), currentUser(req), "resume"));
});

export const end = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.transition(requireParam(req, "id"), currentUser(req), "end"));
});

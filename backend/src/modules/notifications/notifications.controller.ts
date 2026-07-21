// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { noContent, ok, paginated } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import * as service from "./notifications.service";
import type { ListNotificationsInput } from "./notifications.validator";

function currentUserId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.sub;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await service.list(currentUserId(req), req.query as ListNotificationsInput);
  return paginated(res, items, meta);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.markRead(currentUserId(req), requireParam(req, "id")));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(currentUserId(req), requireParam(req, "id"));
  return noContent(res);
});

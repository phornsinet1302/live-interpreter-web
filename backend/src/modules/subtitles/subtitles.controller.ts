// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, noContent, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_BROADCASTS } from "../../websocket/events";
import * as service from "./subtitles.service";
import type { CreateSubtitleSessionInput, UpdateSubtitleSessionInput } from "./subtitles.validator";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const session = await service.create(
    requireParam(req, "conversationId"),
    currentUser(req),
    req.body as CreateSubtitleSessionInput
  );
  return created(res, session);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.get(requireParam(req, "conversationId"), currentUser(req)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = requireParam(req, "conversationId");
  const session = await service.update(conversationId, currentUser(req), req.body as UpdateSubtitleSessionInput);
  getIO().to(conversationRoom(conversationId)).emit(SOCKET_BROADCASTS.SUBTITLE_UPDATED, session);
  return ok(res, session);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(requireParam(req, "conversationId"), currentUser(req));
  return noContent(res);
});

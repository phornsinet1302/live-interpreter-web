// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_BROADCASTS } from "../../websocket/events";
import * as service from "./speakers.service";
import type { CreateSpeakerInput, UpdateSpeakerInput } from "./speakers.validator";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const speaker = await service.create(
    requireParam(req, "conversationId"),
    currentUser(req),
    req.body as CreateSpeakerInput
  );
  return created(res, speaker);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.list(requireParam(req, "conversationId"), currentUser(req)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = requireParam(req, "conversationId");
  const speakerId = requireParam(req, "speakerId");
  const speaker = await service.update(conversationId, speakerId, currentUser(req), req.body as UpdateSpeakerInput);
  getIO().to(conversationRoom(conversationId)).emit(SOCKET_BROADCASTS.SPEAKER_UPDATED, speaker);
  return ok(res, speaker);
});

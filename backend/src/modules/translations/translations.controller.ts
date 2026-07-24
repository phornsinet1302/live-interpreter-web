// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, noContent, ok, paginated } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_BROADCASTS } from "../../websocket/events";
import * as service from "./translations.service";
import type { CreateMessageInput, ListMessagesInput } from "./translations.validator";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = requireParam(req, "conversationId");
  const message = await service.createMessage(conversationId, currentUser(req), req.body as CreateMessageInput);
  getIO().to(conversationRoom(conversationId)).emit(SOCKET_BROADCASTS.MESSAGE_CREATED, message);
  return created(res, message);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await service.list(
    requireParam(req, "conversationId"),
    currentUser(req),
    req.query as ListMessagesInput
  );
  return paginated(res, items, meta);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const message = await service.getById(
    requireParam(req, "conversationId"),
    requireParam(req, "messageId"),
    currentUser(req)
  );
  return ok(res, message);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = requireParam(req, "conversationId");
  const messageId = requireParam(req, "messageId");
  await service.remove(conversationId, messageId, currentUser(req));
  getIO().to(conversationRoom(conversationId)).emit(SOCKET_BROADCASTS.MESSAGE_DELETED, { id: messageId });
  return noContent(res);
});

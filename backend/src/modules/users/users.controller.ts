// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { noContent, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { recordAudit } from "../../lib/audit";
import * as service from "./users.service";
import type { UpdateAvatarInput, UpdatePasswordInput, UpdateProfileInput } from "./users.validator";

function currentUserId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.sub;
}

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.getMe(currentUserId(req)));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateProfile(currentUserId(req), req.body as UpdateProfileInput);
  return ok(res, user);
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateAvatar(currentUserId(req), req.body as UpdateAvatarInput);
  return ok(res, user);
});

export const updatePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  await service.updatePassword(userId, req.body as UpdatePasswordInput);
  recordAudit(req, "change_password", "user", userId);
  return ok(res, { message: "Password updated successfully" });
});

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  await service.deleteMe(userId);
  recordAudit(req, "delete_account", "user", userId);
  return noContent(res);
});

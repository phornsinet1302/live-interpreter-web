import type { Request, Response } from "express";
import * as service from "./users.service";
import { ApiError } from "../../utils/api-error";
import type { UpdateProfileInput } from "./users.validator";

export async function getMe(req: Request, res: Response) {
  const user = await service.getMe(req.user!.id);
  res.json(user);
}

export async function updateMe(req: Request, res: Response) {
  const input = req.body as UpdateProfileInput;
  const user = await service.updateProfile(req.user!.id, input);
  res.json(user);
}

export async function updateAvatar(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest("No file uploaded");
  }
  const user = await service.updateAvatar(req.user!.id, { filename: req.file.filename });
  res.json(user);
}

export async function deleteMe(req: Request, res: Response) {
  await service.deleteAccount(req.user!.id);
  res.status(204).send();
}

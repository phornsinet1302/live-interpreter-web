import type { Request, Response } from "express";
import * as service from "./subtitles.service";
import { param } from "../../utils/request";
import type { CreateSubtitleSessionInput, UpdateSubtitleSessionInput } from "./subtitles.validator";

export async function create(req: Request, res: Response) {
  const input = req.body as CreateSubtitleSessionInput;
  const session = await service.createSession(param(req, "id"), req.user!.id, input);
  res.status(201).json(session);
}

export async function getById(req: Request, res: Response) {
  const session = await service.getSession(param(req, "id"), req.user!.id);
  res.json(session);
}

export async function update(req: Request, res: Response) {
  const input = req.body as UpdateSubtitleSessionInput;
  const session = await service.updateSession(param(req, "id"), req.user!.id, input);
  res.json(session);
}

export async function remove(req: Request, res: Response) {
  await service.deleteSession(param(req, "id"), req.user!.id);
  res.status(204).send();
}

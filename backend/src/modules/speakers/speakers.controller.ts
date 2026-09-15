import type { Request, Response } from "express";
import * as service from "./speakers.service";
import { param } from "../../utils/request";
import type { CreateSpeakerInput, IdentifySpeakerInput, UpdateSpeakerInput } from "./speakers.validator";

export async function create(req: Request, res: Response) {
  const input = req.body as CreateSpeakerInput;
  const speaker = await service.createSpeaker(param(req, "id"), req.user!.id, input);
  res.status(201).json(speaker);
}

export async function list(req: Request, res: Response) {
  const speakers = await service.listSpeakers(param(req, "id"), req.user!.id);
  res.json(speakers);
}

export async function update(req: Request, res: Response) {
  const input = req.body as UpdateSpeakerInput;
  const speaker = await service.updateSpeaker(
    param(req, "id"),
    param(req, "speakerId"),
    req.user!.id,
    input
  );
  res.json(speaker);
}

export async function identify(req: Request, res: Response) {
  const input = req.body as IdentifySpeakerInput;
  const speaker = await service.identifySpeaker(param(req, "id"), req.user!.id, input);
  res.json(speaker);
}

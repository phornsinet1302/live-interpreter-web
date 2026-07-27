import type { Request, Response } from "express";
import * as service from "./summaries.service";
import { param } from "../../utils/request";

export async function create(req: Request, res: Response) {
  const summary = await service.createOrRegenerateSummary(param(req, "id"), req.user!.id);
  res.status(201).json(summary);
}

export async function getById(req: Request, res: Response) {
  const summary = await service.getSummary(param(req, "id"), req.user!.id);
  res.json(summary);
}

export async function remove(req: Request, res: Response) {
  await service.deleteSummary(param(req, "id"), req.user!.id);
  res.status(204).send();
}

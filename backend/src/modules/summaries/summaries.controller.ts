import type { Request, Response } from "express";
import * as service from "./summaries.service";
import { param } from "../../utils/request";
import type { QuickSummaryInput } from "./summaries.validator";

export async function quickSummary(req: Request, res: Response) {
  const result = await service.quickSummarize(req.body as QuickSummaryInput);
  res.json(result);
}

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

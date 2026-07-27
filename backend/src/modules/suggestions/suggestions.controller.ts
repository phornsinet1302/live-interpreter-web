import type { Request, Response } from "express";
import * as service from "./suggestions.service";
import { param } from "../../utils/request";

export async function create(req: Request, res: Response) {
  const suggestions = await service.createSuggestions(param(req, "id"), req.user!.id);
  res.status(201).json(suggestions);
}

export async function list(req: Request, res: Response) {
  const suggestions = await service.listSuggestions(param(req, "id"), req.user!.id);
  res.json(suggestions);
}

import type { Request, Response } from "express";
import * as service from "./analytics.service";

export async function dashboard(req: Request, res: Response) {
  res.json(await service.getDashboard(req.user!.id));
}

export async function translations(req: Request, res: Response) {
  res.json(await service.getTranslationStats(req.user!.id));
}

export async function languages(req: Request, res: Response) {
  res.json(await service.getLanguageStats(req.user!.id));
}

export async function users(_req: Request, res: Response) {
  res.json(await service.getUserStats());
}

export async function apiUsage(_req: Request, res: Response) {
  res.json(await service.getApiUsageStats());
}

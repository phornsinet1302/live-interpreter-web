// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ok } from "../../utils/api-response";
import * as service from "./analytics.service";
import type { RangeQueryInput } from "./analytics.validator";

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await service.getDashboard());
});

export const translations = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.getTranslationStats(req.query as unknown as RangeQueryInput));
});

export const languages = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await service.getLanguageStats());
});

export const users = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.getUserStats(req.query as unknown as RangeQueryInput));
});

export const apiUsage = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.getApiUsageStats(req.query as unknown as RangeQueryInput));
});

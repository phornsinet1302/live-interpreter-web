// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, noContent, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { requireParam } from "../../utils/params";
import * as service from "./exports.service";
import type { CreateExportInput } from "./exports.validator";

function currentUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const exportRecord = await service.create(
    requireParam(req, "conversationId"),
    currentUser(req),
    req.body as CreateExportInput
  );
  return created(res, exportRecord);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await service.get(requireParam(req, "id"), currentUser(req)));
});

export const download = asyncHandler(async (req: Request, res: Response) => {
  const { filePath, fileName } = await service.getDownloadPath(requireParam(req, "id"), currentUser(req));
  return res.download(filePath, fileName);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(requireParam(req, "id"), currentUser(req));
  return noContent(res);
});

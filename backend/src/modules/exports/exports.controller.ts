import type { Request, Response } from "express";
import * as service from "./exports.service";
import { param } from "../../utils/request";
import type { CreateExportInput } from "./exports.validator";

export async function create(req: Request, res: Response) {
  const { type } = req.body as CreateExportInput;
  const record = await service.createExport(param(req, "id"), req.user!.id, type);
  res.status(201).json(record);
}

export async function getById(req: Request, res: Response) {
  const record = await service.getExport(param(req, "id"), req.user!.id);
  res.json(record);
}

export async function remove(req: Request, res: Response) {
  await service.deleteExport(param(req, "id"), req.user!.id);
  res.status(204).send();
}

export async function download(req: Request, res: Response) {
  const filePath = await service.getDownloadPath(param(req, "id"), req.user!.id);
  res.download(filePath);
}

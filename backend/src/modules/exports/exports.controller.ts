import type { Request, Response } from "express";
import * as service from "./exports.service";
import { param } from "../../utils/request";
import { ApiError } from "../../utils/api-error";
import type { CreateExportInput } from "./exports.validator";

export async function create(req: Request, res: Response) {
  const { type, format } = req.body as CreateExportInput;
  const record = await service.createExport(param(req, "id"), req.user!.id, type, format);
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
  const target = await service.getDownloadTarget(param(req, "id"), req.user!.id);

  // Proxying the bytes ourselves (instead of redirecting to Cloudinary) lets
  // us set our own Content-Disposition — Cloudinary's fl_attachment:<filename>
  // transformation flag kept rejecting otherwise-valid filenames.
  const upstream = await fetch(target.url);
  if (!upstream.ok || !upstream.body) {
    throw new ApiError(502, "Failed to retrieve the export file", "EXPORT_FETCH_FAILED");
  }

  res.setHeader("Content-Type", target.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${target.filename}"`);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}

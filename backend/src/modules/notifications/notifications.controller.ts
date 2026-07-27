import type { Request, Response } from "express";
import * as service from "./notifications.service";
import { param } from "../../utils/request";
import type { ListNotificationsQuery } from "./notifications.validator";

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as ListNotificationsQuery;
  const result = await service.listNotifications(req.user!.id, query);
  res.json(result);
}

export async function markRead(req: Request, res: Response) {
  const notification = await service.markRead(param(req, "id"), req.user!.id);
  res.json(notification);
}

export async function remove(req: Request, res: Response) {
  await service.remove(param(req, "id"), req.user!.id);
  res.status(204).send();
}

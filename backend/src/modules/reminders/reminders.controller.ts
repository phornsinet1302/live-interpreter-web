import type { Request, Response } from "express";
import * as service from "./reminders.service";
import { param } from "../../utils/request";
import type { CreateReminderInput, ListRemindersQuery } from "./reminders.validator";

export async function create(req: Request, res: Response) {
  const input = req.body as CreateReminderInput;
  const reminder = await service.createReminder(req.user!.id, input);
  res.status(201).json(reminder);
}

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as ListRemindersQuery;
  res.json(await service.listReminders(req.user!.id, query));
}

export async function remove(req: Request, res: Response) {
  await service.cancelReminder(param(req, "id"), req.user!.id);
  res.status(204).send();
}

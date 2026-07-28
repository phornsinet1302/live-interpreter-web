import type { Request, Response } from "express";
import * as service from "./translations.service";
import { param } from "../../utils/request";
import type { CreateMessageInput, ListMessagesQuery, QuickTranslateInput } from "./translations.validator";

export async function quickTranslate(req: Request, res: Response) {
  const { text, sourceLanguage, targetLanguage } = req.body as QuickTranslateInput;
  const result = await service.translateText(text, sourceLanguage, targetLanguage);
  res.json(result);
}

export async function create(req: Request, res: Response) {
  const input = req.body as CreateMessageInput;
  const message = await service.createMessage(param(req, "id"), req.user!.id, input);
  res.status(201).json(message);
}

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as ListMessagesQuery;
  const result = await service.listMessages(param(req, "id"), req.user!.id, query);
  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const message = await service.getMessage(param(req, "id"), param(req, "messageId"), req.user!.id);
  res.json(message);
}

export async function remove(req: Request, res: Response) {
  await service.deleteMessage(param(req, "id"), param(req, "messageId"), req.user!.id);
  res.status(204).send();
}

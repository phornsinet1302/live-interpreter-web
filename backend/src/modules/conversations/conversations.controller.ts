import type { Request, Response } from "express";
import * as service from "./conversations.service";
import { param } from "../../utils/request";
import type {
  CreateConversationInput,
  ListConversationsQuery,
  UpdateConversationInput,
} from "./conversations.validator";

export async function create(req: Request, res: Response) {
  const input = req.body as CreateConversationInput;
  const conversation = await service.createConversation(req.user!.id, input);
  res.status(201).json(conversation);
}

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as ListConversationsQuery;
  const result = await service.listConversations(req.user!.id, query);
  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const conversation = await service.getConversationForOwner(param(req, "id"), req.user!.id);
  res.json(conversation);
}

export async function update(req: Request, res: Response) {
  const input = req.body as UpdateConversationInput;
  const conversation = await service.updateConversation(param(req, "id"), req.user!.id, input);
  res.json(conversation);
}

export async function remove(req: Request, res: Response) {
  await service.deleteConversation(param(req, "id"), req.user!.id);
  res.status(204).send();
}

export async function start(req: Request, res: Response) {
  const conversation = await service.transition(param(req, "id"), req.user!.id, "start");
  res.json(conversation);
}

export async function pause(req: Request, res: Response) {
  const conversation = await service.transition(param(req, "id"), req.user!.id, "pause");
  res.json(conversation);
}

export async function resume(req: Request, res: Response) {
  const conversation = await service.transition(param(req, "id"), req.user!.id, "resume");
  res.json(conversation);
}

export async function end(req: Request, res: Response) {
  const conversation = await service.transition(param(req, "id"), req.user!.id, "end");
  res.json(conversation);
}

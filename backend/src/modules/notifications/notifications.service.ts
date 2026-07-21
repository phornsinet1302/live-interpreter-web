// Service -> business rules & orchestration. Calls repository. No req/res.
import { AppError } from "../../utils/app-error";
import { parsePagination } from "../../utils/pagination";
import * as repo from "./notifications.repository";
import type { ListNotificationsInput } from "./notifications.validator";

export async function list(userId: string, query: ListNotificationsInput) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await repo.listForUser(userId, query.unreadOnly === "true", skip, take);
  return { items, meta: { page, limit, total } };
}

export async function markRead(userId: string, id: string) {
  const notification = await repo.findById(userId, id);
  if (!notification) throw AppError.notFound("Notification not found");
  return repo.markRead(id);
}

export async function remove(userId: string, id: string) {
  const { count } = await repo.remove(userId, id);
  if (count === 0) throw AppError.notFound("Notification not found");
}

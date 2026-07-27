import * as repo from "./notifications.repository";
import { ApiError } from "../../utils/api-error";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import type { ListNotificationsQuery } from "./notifications.validator";

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const { page, limit, skip, take } = toSkipTake(query as PaginationQuery);
  const filters = query.isRead === undefined ? {} : { isRead: query.isRead };
  const [data, total] = await Promise.all([
    repo.findManyByUser(userId, filters, skip, take),
    repo.countByUser(userId, filters),
  ]);
  return paginated(data, total, page, limit);
}

export async function markRead(id: string, userId: string) {
  const notification = await repo.findById(userId, id);
  if (!notification) throw ApiError.notFound("Notification not found");
  return repo.markRead(id);
}

export async function remove(id: string, userId: string) {
  const notification = await repo.findById(userId, id);
  if (!notification) throw ApiError.notFound("Notification not found");
  await repo.remove(id);
}

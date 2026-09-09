import * as repo from "./reminders.repository";
import { ApiError } from "../../utils/api-error";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import type { CreateReminderInput, ListRemindersQuery } from "./reminders.validator";

export async function createReminder(userId: string, input: CreateReminderInput) {
  const remindAt = new Date(input.remindAt);
  if (remindAt.getTime() <= Date.now()) {
    throw ApiError.badRequest("remindAt must be in the future");
  }
  return repo.create(userId, { message: input.message, remindAt });
}

export async function listReminders(userId: string, query: ListRemindersQuery) {
  const { page, limit, skip, take } = toSkipTake(query as PaginationQuery);
  const [data, total] = await Promise.all([
    repo.findManyByUser(userId, skip, take),
    repo.countByUser(userId),
  ]);
  return paginated(data, total, page, limit);
}

export async function cancelReminder(id: string, userId: string) {
  const reminder = await repo.findById(userId, id);
  if (!reminder) throw ApiError.notFound("Reminder not found");
  await repo.remove(id);
}

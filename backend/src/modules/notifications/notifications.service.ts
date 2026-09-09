import * as repo from "./notifications.repository";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { getIO } from "../../websocket/socket";
import { userRoom, SOCKET_EVENTS } from "../../websocket/events";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import type { NotificationType } from "../../lib/prisma-client";
import type { ListNotificationsQuery } from "./notifications.validator";

export type NotificationPreferenceKey =
  | "notifyExportCompleted"
  | "notifyTranslationCompleted"
  | "notifySystemUpdates"
  | "notifyReminders";

async function preferenceEnabled(userId: string, key: NotificationPreferenceKey): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notifyExportCompleted: true,
      notifyTranslationCompleted: true,
      notifySystemUpdates: true,
      notifyReminders: true,
    },
  });
  // Fail open: a lookup miss shouldn't silently swallow a real notification
  // (a nonexistent user id here is a bug elsewhere, not a normal case).
  return user ? user[key] : true;
}

// Central entry point for every notification the system creates (export
// completed, translation completed, reminders — see call sites in those
// modules) — respects the user's per-category preference (FR-12) and pushes
// the notification live over the user's socket room (FR-13), so callers
// don't have to duplicate (or forget) either step.
export async function createForUser(
  userId: string,
  data: { title: string; message: string; type?: NotificationType; preferenceKey: NotificationPreferenceKey }
) {
  if (!(await preferenceEnabled(userId, data.preferenceKey))) return null;

  const notification = await repo.create({
    userId,
    title: data.title,
    message: data.message,
    type: data.type,
  });
  getIO()?.to(userRoom(userId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
  return notification;
}

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const { page, limit, skip, take } = toSkipTake(query as PaginationQuery);
  const filters = query.isRead === undefined ? {} : { isRead: query.isRead };
  const [data, total] = await Promise.all([
    repo.findManyByUser(userId, filters, skip, take),
    repo.countByUser(userId, filters),
  ]);
  return paginated(data, total, page, limit);
}

export async function unreadCount(userId: string) {
  return { count: await repo.countByUser(userId, { isRead: false }) };
}

export async function markRead(id: string, userId: string) {
  const notification = await repo.findById(userId, id);
  if (!notification) throw ApiError.notFound("Notification not found");
  return repo.markRead(id);
}

export async function markAllRead(userId: string) {
  await repo.markAllReadForUser(userId);
}

export async function remove(id: string, userId: string) {
  const notification = await repo.findById(userId, id);
  if (!notification) throw ApiError.notFound("Notification not found");
  await repo.remove(id);
}

// Admin/moderator only (see notifications.route.ts) — "system updates" (FR-13):
// one notification per opted-in user. createMany doesn't hand back the rows
// it inserted, so the realtime push below is a lightweight synthetic payload
// rather than a re-fetch of every row it just wrote.
export async function broadcastSystemUpdate(title: string, message: string) {
  const recipients = await prisma.user.findMany({
    where: { deletedAt: null, notifySystemUpdates: true },
    select: { id: true },
  });
  if (recipients.length === 0) return { recipientCount: 0 };

  await prisma.notification.createMany({
    data: recipients.map((u) => ({ userId: u.id, title, message, type: "info" as const })),
  });

  const io = getIO();
  if (io) {
    for (const { id } of recipients) {
      io.to(userRoom(id)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, { title, message, type: "info" });
    }
  }

  return { recipientCount: recipients.length };
}

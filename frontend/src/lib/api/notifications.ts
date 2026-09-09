import { authFetch } from "./utils/authFetch";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function listNotifications(): Promise<Paginated<NotificationItem>> {
  const res = await authFetch("/notifications?limit=20");
  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const res = await authFetch("/notifications/unread-count");
  if (!res.ok) return 0;
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await authFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await authFetch("/notifications/read-all", { method: "PATCH" });
}

export async function deleteNotification(id: string): Promise<void> {
  await authFetch(`/notifications/${id}`, { method: "DELETE" });
}

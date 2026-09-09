import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

// Admin/moderator only — "system updates" (FR-13).
export const broadcastSchema = z.object({
  title: z.string().min(1).max(150),
  message: z.string().min(1).max(1000),
});
export type BroadcastInput = z.infer<typeof broadcastSchema>;

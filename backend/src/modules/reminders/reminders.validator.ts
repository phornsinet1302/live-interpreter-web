import { z } from "zod";

export const createReminderSchema = z.object({
  message: z.string().min(1).max(500),
  // ISO 8601 — z.coerce.date() also accepts a bare epoch number, which isn't
  // part of the documented contract here, so this stays string-only.
  remindAt: z.string().datetime(),
});
export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const listRemindersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListRemindersQuery = z.infer<typeof listRemindersQuerySchema>;

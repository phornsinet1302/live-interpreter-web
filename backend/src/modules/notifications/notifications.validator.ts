import { z } from "zod";

export const listNotificationsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
});
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

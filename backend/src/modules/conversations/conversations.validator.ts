import { z } from "zod";

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
  isFavorite: z.boolean().optional(),
});
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

export const listConversationsQuerySchema = z.object({
  status: z.enum(["waiting", "active", "paused", "ended", "archived"]).optional(),
  isFavorite: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

import { z } from "zod";

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
});
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

export const listConversationsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(["waiting", "active", "paused", "ended"]).optional(),
});
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;

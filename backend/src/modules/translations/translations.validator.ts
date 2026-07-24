import { z } from "zod";

export const createMessageSchema = z.object({
  speakerId: z.string().uuid().optional(),
  originalText: z.string().trim().min(1).max(4000),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const listMessagesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;

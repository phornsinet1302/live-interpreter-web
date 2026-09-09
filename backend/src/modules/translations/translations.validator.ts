import { z } from "zod";

export const createMessageSchema = z.object({
  speakerId: z.string().uuid().optional(),
  originalText: z.string().min(1),
  sourceLanguage: z.string().min(2).max(10).optional(),
  targetLanguage: z.string().min(2).max(10).optional(),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// Unauthenticated, not tied to a conversation — used by the pre-signup
// live-translate demo, so text is capped well below a real spoken sentence
// to keep the cost of abuse low.
export const quickTranslateSchema = z.object({
  text: z.string().min(1).max(1000),
  sourceLanguage: z.string().min(2).max(30),
  targetLanguage: z.string().min(2).max(30),
});
export type QuickTranslateInput = z.infer<typeof quickTranslateSchema>;

// Unauthenticated, used by the browser extension's highlight-to-translate
// popover — a highlighted selection can run longer than a single word (up
// to a paragraph), but nowhere near a full spoken transcript's length, so
// this sits between quickTranslateSchema's cap and a full message.
// sourceLanguage allows "auto" since the extension doesn't ask the user to
// pick a source language up front.
export const lookupSchema = z.object({
  text: z.string().min(1).max(500),
  sourceLanguage: z.string().min(2).max(30),
  targetLanguage: z.string().min(2).max(30),
});
export type LookupInput = z.infer<typeof lookupSchema>;

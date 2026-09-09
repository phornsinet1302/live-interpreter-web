import { z } from "zod";

export const createSubtitleSessionSchema = z.object({
  fontSize: z.number().int().min(1).max(72).optional(),
  fontColor: z.string().min(1).max(20).optional(),
  backgroundColor: z.string().min(1).max(20).optional(),
});
export type CreateSubtitleSessionInput = z.infer<typeof createSubtitleSessionSchema>;

export const updateSubtitleSessionSchema = z.object({
  fontSize: z.number().int().min(1).max(72).optional(),
  fontColor: z.string().min(1).max(20).optional(),
  backgroundColor: z.string().min(1).max(20).optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
});
export type UpdateSubtitleSessionInput = z.infer<typeof updateSubtitleSessionSchema>;

// Live caption relay (FR-3) — not persisted, just forwarded to whoever's
// watching (see subtitles.service.ts's pushText).
export const pushSubtitleTextSchema = z.object({
  source: z.string().min(1).max(2000),
  translated: z.string().min(1).max(2000),
  speakerName: z.string().max(100).optional(),
});
export type PushSubtitleTextInput = z.infer<typeof pushSubtitleTextSchema>;

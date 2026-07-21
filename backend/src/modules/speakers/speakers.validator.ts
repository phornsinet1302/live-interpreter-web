import { z } from "zod";

export const createSpeakerSchema = z.object({
  label: z.string().trim().min(1).max(100),
  displayName: z.string().trim().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>;

export const updateSpeakerSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type UpdateSpeakerInput = z.infer<typeof updateSpeakerSchema>;

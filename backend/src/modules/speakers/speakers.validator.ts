import { z } from "zod";

export const createSpeakerSchema = z.object({
  label: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100).optional(),
});
export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>;

export const updateSpeakerSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
});
export type UpdateSpeakerInput = z.infer<typeof updateSpeakerSchema>;

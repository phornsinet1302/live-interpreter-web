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

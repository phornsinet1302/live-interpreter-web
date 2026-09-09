import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifyExportCompleted: z.boolean().optional(),
  notifyTranslationCompleted: z.boolean().optional(),
  notifySystemUpdates: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

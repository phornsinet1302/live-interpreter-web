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

// token is null to unregister this device (e.g. notifications toggled off,
// or Expo failed to hand back a token) — distinct from omitting the field.
export const updatePushTokenSchema = z.object({
  token: z.string().min(1).nullable(),
});
export type UpdatePushTokenInput = z.infer<typeof updatePushTokenSchema>;

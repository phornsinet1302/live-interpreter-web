import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().url(),
});
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).max(72),
});
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

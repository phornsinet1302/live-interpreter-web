// Zod input schemas for this module.
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  preferredLanguage: z.string().min(2).max(10).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutInput = z.infer<typeof logoutSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

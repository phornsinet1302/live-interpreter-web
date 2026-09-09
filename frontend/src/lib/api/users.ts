import { authFetch } from "./utils/authFetch";
import type { UserAccount } from "@/types";

// Structurally compatible with both GET /users/me's response and the
// `user` object returned by auth register/login (both are the backend's
// PublicUser) — only the fields this mapping actually reads.
interface BackendPublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  theme: string;
  notifyExportCompleted: boolean;
  notifyTranslationCompleted: boolean;
  notifySystemUpdates: boolean;
  notifyReminders: boolean;
}

export function toUserAccount(u: BackendPublicUser): UserAccount {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    preferredLanguage: u.preferredLanguage,
    theme: (u.theme as UserAccount["theme"]) || "system",
    notifications: {
      exportCompleted: u.notifyExportCompleted,
      translationCompleted: u.notifyTranslationCompleted,
      systemUpdates: u.notifySystemUpdates,
      reminders: u.notifyReminders,
    },
  };
}

export async function getProfile(): Promise<UserAccount> {
  const res = await authFetch("/users/me");
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
  return toUserAccount(await res.json());
}

export interface UpdateProfileInput {
  name?: string;
  preferredLanguage?: string;
  theme?: "light" | "dark" | "system";
  notifyExportCompleted?: boolean;
  notifyTranslationCompleted?: boolean;
  notifySystemUpdates?: boolean;
  notifyReminders?: boolean;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserAccount> {
  const res = await authFetch("/users/me", { method: "PUT", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(`Failed to update profile (${res.status})`);
  return toUserAccount(await res.json());
}

export async function uploadAvatar(file: File): Promise<UserAccount> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await authFetch("/users/me/avatar", { method: "PATCH", body: formData });
  if (!res.ok) throw new Error(`Failed to upload avatar (${res.status})`);
  return toUserAccount(await res.json());
}

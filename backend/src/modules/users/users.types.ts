export interface UpdateProfileInput {
  name?: string;
  preferredLanguage?: string;
  theme?: "light" | "dark" | "system";
  notifyExportCompleted?: boolean;
  notifyTranslationCompleted?: boolean;
  notifySystemUpdates?: boolean;
  notifyReminders?: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  theme: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  notifyExportCompleted: boolean;
  notifyTranslationCompleted: boolean;
  notifySystemUpdates: boolean;
  notifyReminders: boolean;
}

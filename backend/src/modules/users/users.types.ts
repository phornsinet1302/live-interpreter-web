export interface UpdateProfileInput {
  name?: string;
  preferredLanguage?: string;
  theme?: "light" | "dark" | "system";
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword: string;
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
}

import type { PublicUser } from "../../utils/serialize";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

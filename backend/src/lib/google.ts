import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

const client = new OAuth2Client(env.googleClientId);

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Verifies a Google Sign-In ID token (issued client-side) and returns the
// profile claims we care about. Throws if the token is invalid/expired/
// issued for a different client.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.googleClientId) throw AppError.badRequest("Google sign-in is not configured");

  const ticket = await client
    .verifyIdToken({ idToken, audience: env.googleClientId })
    .catch(() => {
      throw AppError.unauthorized("Invalid Google token");
    });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw AppError.unauthorized("Invalid Google token");

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email,
    avatarUrl: payload.picture,
  };
}

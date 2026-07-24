import type { User } from "../lib/prisma-client";

// Strips fields that should never leave the server (password hash) before a
// user record is sent in a response.
export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export type PublicUser = ReturnType<typeof toPublicUser>;

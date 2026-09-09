import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";

// Clerk owns credentials/verification/sessions now (see clerkMiddleware() in
// app.ts, which populates the AsyncLocalStorage state getAuth() reads here).
// The local `users` table is kept as an app-specific profile — avatar,
// preferredLanguage, theme, notification prefs — that Clerk doesn't store,
// keyed by Clerk's own user id instead of a self-generated uuid. Every other
// module only ever reads req.user.id/req.user.role, so preserving that exact
// shape here means nothing downstream needs to change.
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // treatPendingAsSignedOut defaults to true in Clerk's SDK — a session is
  // "pending" when it has outstanding Session Tasks (e.g. organization
  // selection). This app doesn't use Clerk Organizations and has no UI for
  // resolving such a task, so every brand-new sign-in was permanently stuck
  // "pending" and getAuth() was treating it as signed-out, even though the
  // session itself is valid — the actual bug behind "signed in but still
  // shows Sign in/Get started".
  const auth = getAuth(req, { treatPendingAsSignedOut: false });
  if (!auth.userId) {
    throw ApiError.unauthorized("Missing or invalid session");
  }

  let profile = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!profile) {
    // First time this Clerk identity has ever hit this backend — find-or-create.
    // upsert (not create) so two requests racing on a brand-new user's very
    // first page load can't both try to insert the same row.
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw ApiError.unauthorized("Clerk account has no email address");
    }
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      email.split("@")[0];

    // `email` is unique, so this insert collides if the same address was
    // used on a pre-Clerk account (this app used to run its own email/
    // password sign-up before this migration). That old row's id will never
    // match a real Clerk user id again — it's already-agreed-abandoned data
    // (see the migration plan) — so free up the email by renaming it on the
    // stale row rather than leaving every future sign-in for this address
    // permanently unable to create its profile.
    const legacyRow = await prisma.user.findFirst({
      where: { email, id: { not: auth.userId } },
      select: { id: true },
    });
    if (legacyRow) {
      await prisma.user.update({
        where: { id: legacyRow.id },
        data: { email: `${legacyRow.id}+superseded@legacy.invalid` },
      });
    }

    profile = await prisma.user.upsert({
      where: { id: auth.userId },
      update: {},
      create: {
        id: auth.userId,
        email,
        name,
        isVerified: true, // Clerk already enforced verification before a session exists
      },
      select: { id: true, role: true, deletedAt: true },
    });
  }

  if (profile.deletedAt) {
    throw ApiError.unauthorized("Account no longer exists");
  }

  req.user = { id: profile.id, role: profile.role };
  next();
}

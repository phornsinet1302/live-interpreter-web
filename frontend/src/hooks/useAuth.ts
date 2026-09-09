import { useEffect, useRef, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { getProfile } from "../lib/api/users";
import type { UserAccount } from "../types";

const RETRY_DELAYS_MS = [500, 1500, 3000];

// Merges Clerk (identity/session) with this app's own profile data (avatar,
// preferredLanguage, theme, notification prefs — fields Clerk doesn't store).
// Keeps returning the same UserAccount shape the rest of the app already
// expects, so Navbar/UserNav/Settings/LiveTranslate/History/Dashboard need
// no changes beyond where they get `user` from.
export function useAuth() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();
  const [user, setUser] = useState<UserAccount | null>(null);
  // Distinguishes "signed out" from "signed in but the profile sync failed"
  // — the header needs this to avoid showing "Sign in" (misleading, and a
  // dead end: Clerk still thinks this browser is authenticated, so clicking
  // it re-mounts the sign-in form on top of an already-active session)
  // when what actually happened is the backend call failing.
  const [profileError, setProfileError] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshUser = () =>
    getProfile()
      .then((u) => {
        setUser(u);
        setProfileError(false);
      })
      .catch((err) => {
        setUser(null);
        setProfileError(true);
        throw err;
      });

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setProfileError(false);
      return;
    }

    // Right after a fresh sign-in, Clerk's own session/token machinery can
    // take a moment to fully settle in the browser — a getProfile() call
    // fired at that exact instant can 401 (no token attached yet) even
    // though the session itself is perfectly valid a moment later. Without
    // a retry, that one bad-timing request permanently stuck the header on
    // "Sign in" for an otherwise-successful sign-in. Retries with backoff;
    // any successful attempt (including a manual refreshUser() call from
    // elsewhere) cancels the rest.
    let cancelled = false;
    const attempt = (retriesLeft: number) => {
      refreshUser().catch(() => {
        if (cancelled || retriesLeft <= 0) return;
        const delay = RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - retriesLeft] ?? RETRY_DELAYS_MS.at(-1)!;
        retryTimerRef.current = setTimeout(() => attempt(retriesLeft - 1), delay);
      });
    };
    attempt(RETRY_DELAYS_MS.length);

    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return {
    user,
    isLoaded,
    // True as soon as Clerk itself considers the browser authenticated,
    // regardless of whether the app's own profile fetch has succeeded yet —
    // lets the header show a "signed in, but couldn't load your profile"
    // state (with a working sign-out) instead of falling back to "Sign in".
    isSignedIn: !!isSignedIn,
    profileError,
    logout: () => signOut(),
    refreshUser,
    setUser,
  };
}

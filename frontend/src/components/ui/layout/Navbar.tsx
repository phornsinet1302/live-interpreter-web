import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import UserNav from "./UserNav";
import NotificationBell from "./NotificationBell";
import Logo from "@/components/ui/common/Logo";
import MagneticButton from "@/components/ui/common/MagneticButton";
import { UserAccount } from "@/types";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";
import { fadeUp } from "@/lib/motion";

export default function Navbar({
  user,
  isSignedIn,
  onLive,
  onSignIn,
  onSignUp,
  onHistory,
  onDashboard,
  onSettings,
  onSignOut,
}: {
  user: UserAccount | null;
  // Clerk's own signed-in state, distinct from `user` (this app's synced
  // profile) — Clerk can consider the browser authenticated a moment before
  // (or, on a persistent backend failure, indefinitely after) the profile
  // fetch succeeds. Without this, that gap showed "Sign in"/"Get started"
  // while actually signed in — clicking either just re-mounted the sign-in
  // form on top of an already-active session with no way to recover.
  isSignedIn: boolean;
  onLive: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onHistory: () => void;
  onDashboard: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  const { reduceMotion, isMobile } = useMotionPrefs();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      {...fadeUp({ y: -15, duration: 0.6, reduceMotion, isMobile })}
      className={`sticky top-0 z-50 flex items-center justify-between px-8 md:px-16 py-5 border-b transition-colors duration-300 ${
        scrolled ? "bg-background/70 backdrop-blur-md border-border/50 shadow-sm" : "bg-transparent border-transparent"
      }`}
    >
      <button
        onClick={onLive}
        className="hover:opacity-80 transition-opacity outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Logo size="text-xl" />
      </button>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <NotificationBell />
            <UserNav user={user} onHistory={onHistory} onDashboard={onDashboard} onSettings={onSettings} onSignOut={onSignOut} />
          </>
        ) : isSignedIn ? (
          <button
            onClick={onSignOut}
            title="Signed in, but your profile couldn't be loaded — try signing out and back in."
            className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-[250ms] outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-accent/50 px-1"
          >
            Sign out
          </button>
        ) : (
          <>
            <button
              onClick={onSignIn}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-[250ms] outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-accent/50 px-1"
            >
              Sign in
            </button>
            <MagneticButton
              onClick={onSignUp}
              magneticStrength={0.15}
              className="bg-primary text-primary-foreground text-sm px-5 py-2 rounded-full font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-[background-color,box-shadow,filter] duration-[250ms] hover:bg-accent hover:shadow-md hover:brightness-105"
            >
              Get started
            </MagneticButton>
          </>
        )}
      </div>
    </motion.nav>
  );
}

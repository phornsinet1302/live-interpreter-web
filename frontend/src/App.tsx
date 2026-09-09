import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth } from "./hooks/useAuth";
import LiveTranslatePage from "./routes/LiveTranslate";
import AboutPage from "./routes/About";
import SignInPage from "./routes/SignIn";
import SignUpPage from "./routes/SignUp";
import HistoryPage from "./routes/History";
import DashboardPage from "./routes/Dashboard";
import SettingsPage from "./routes/Settings";
import { Toaster } from "./components/ui/sonner";
import { LANGUAGES } from "./lib/api/utils/constant";
import { useMotionPrefs } from "./hooks/useMotionPrefs";
import { createConversation, createMessage, startConversation, endConversation, saveSummary } from "./lib/api/conversations";

export type PendingConversation = {
  sourceLang: string;
  targetLang: string;
  exchanges: { source: string; translated: string }[];
  summary?: string[];
  nextSteps?: string[];
  actionItems?: string[];
  keywords?: string[];
};

// Mirrors a session into the real backend (Conversation + ConversationMessage
// + Summary rows) so History (FR-5), the analytics dashboard, and export
// (PDF/DOCX) all have something real to read from. The summary is saved
// as-is from the live Gemini quick-summary the user already saw (see
// summaries.service.saveSummary) rather than triggering an independent
// OpenAI regeneration that could disagree with it. Returns whether it
// actually succeeded so callers driven by an explicit user action (the
// signed-in "Save to history" prompt) can show real success/failure
// feedback, rather than the silent best-effort this also serves as for the
// guest sign-in hand-off (where there's no session left to report back to).
async function persistSessionToBackend(pending: PendingConversation): Promise<boolean> {
  if (pending.exchanges.length === 0) return false;
  try {
    const conversation = await createConversation(pending.sourceLang, pending.targetLang);
    await startConversation(conversation.id);
    for (const exchange of pending.exchanges) {
      await createMessage(conversation.id, exchange.source, pending.sourceLang, pending.targetLang);
    }
    if (pending.summary?.length) {
      await saveSummary(conversation.id, {
        summary: pending.summary.join(" "),
        keyPoints: pending.summary,
        actionItems: pending.actionItems ?? [],
        keywords: pending.keywords ?? [],
      }).catch(() => {});
    }
    await endConversation(conversation.id);
    return true;
  } catch (err) {
    console.error("Failed to save session to your account", err);
    return false;
  }
}

export default function App() {
  const [page, setPage] = useState<"live" | "about" | "signin" | "signup" | "history" | "dashboard" | "settings">("about");
  const { user, logout, setUser } = useAuth();
  const { isSignedIn } = useClerkAuth();
  const { reduceMotion } = useMotionPrefs();
  const { setTheme } = useTheme();
  const [pendingConversation, setPendingConversation] = useState<PendingConversation | null>(null);
  // Set when the home page's embedded mic widget is tapped (see About.tsx) —
  // carries the languages chosen there and tells the Live page to start
  // listening immediately on arrival instead of landing idle. Cleared as
  // soon as the Live page consumes it, so a later, unrelated trip back to
  // "live" (e.g. from History) doesn't re-trigger it.
  const [quickStart, setQuickStart] = useState<{ sourceLang: string; targetLang: string } | null>(null);

  const goLive = () => {
    setQuickStart(null);
    setPage("live");
  };

  const handleQuickStart = (sourceLang: string, targetLang: string) => {
    setQuickStart({ sourceLang, targetLang });
    setPage("live");
  };

  // Applies the account's saved theme preference (FR-12) whenever the signed-in
  // user changes — covers both login and any later change made in Settings.
  useEffect(() => {
    if (user) setTheme(user.theme);
  }, [user, setTheme]);

  // Clerk's SignIn/SignUp components no longer call back into an onLogin
  // prop — this watches Clerk's own signed-in state instead, which covers
  // both flows (sign-in and sign-up) converging on the same transition.
  const wasSignedIn = useRef(isSignedIn);
  useEffect(() => {
    if (!wasSignedIn.current && isSignedIn) {
      if (pendingConversation) {
        void persistSessionToBackend(pendingConversation);
        setPendingConversation(null);
      }
      setPage("live");
    }
    wasSignedIn.current = isSignedIn;
  }, [isSignedIn, pendingConversation]);

  const handleSignOut = () => {
    logout();
    setPage("about");
  };

  // Page routing
  const renderPage = () => {
    if (page === "live") {
      const preferredSource =
        quickStart?.sourceLang ??
        (user?.preferredLanguage && LANGUAGES.includes(user.preferredLanguage) ? user.preferredLanguage : "English");
      return (
        <LiveTranslatePage
          sourceLang={preferredSource}
          targetLang={quickStart?.targetLang ?? "Khmer"}
          autoStart={quickStart !== null}
          onAutoStartConsumed={() => setQuickStart(null)}
          user={user}
          isSignedIn={!!isSignedIn}
          onSaveSession={persistSessionToBackend}
          onGoAbout={() => { setQuickStart(null); setPage("about"); }}
          onGoSignIn={(conv) => {
            if (conv) setPendingConversation(conv);
            setPage("signin");
          }}
          onGoSignUp={() => setPage("signup")}
          onGoHistory={() => setPage("history")}
          onGoDashboard={() => setPage("dashboard")}
          onGoSettings={() => setPage("settings")}
          onSignOut={handleSignOut}
        />
      );
    }

    if (page === "signin") {
      return (
        <SignInPage
          onBack={() => setPage("about")}
          onGoSignUp={() => setPage("signup")}
        />
      );
    }

    if (page === "signup") {
      return (
        <SignUpPage
          onBack={() => setPage("about")}
          onGoSignIn={() => setPage("signin")}
        />
      );
    }

    if (page === "history" && user) {
      return (
        <HistoryPage
          user={user}
          onBack={() => setPage("live")}
          onDashboard={() => setPage("dashboard")}
          onSettings={() => setPage("settings")}
        />
      );
    }

    if (page === "dashboard" && user) {
      return <DashboardPage user={user} onBack={() => setPage("live")} onSettings={() => setPage("settings")} />;
    }

    if (page === "settings" && user) {
      return <SettingsPage user={user} onBack={() => setPage("live")} onUserUpdate={setUser} />;
    }

    // default: about page
    return (
      <AboutPage
        user={user}
        isSignedIn={!!isSignedIn}
        onLive={goLive}
        onQuickStart={handleQuickStart}
        onSignIn={() => setPage("signin")}
        onSignUp={() => setPage("signup")}
        onHistory={() => setPage("history")}
        onDashboard={() => setPage("dashboard")}
        onSettings={() => setPage("settings")}
        onSignOut={handleSignOut}
      />
    );
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
      <Toaster position="bottom-center" />
    </>
  );
}
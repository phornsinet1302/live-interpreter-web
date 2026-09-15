import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Maximize2, Minimize2, Plus } from "lucide-react";
import { UserAccount } from "@/types";
import type { PendingConversation } from "@/App";
import { useLiveInterpreter } from "@/hooks/useLiveInterpreter";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import Logo from "@/components/ui/common/Logo";
import ExitModal from "@/components/ui/features/translation/ExitModal";
import SaveSessionModal from "@/components/ui/features/translation/SaveSessionModal";
import LiveInterpreterView from "@/components/ui/features/translation/LiveInterpreterView";
import UserNav from "@/components/ui/layout/UserNav";
import NotificationBell from "@/components/ui/layout/NotificationBell";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";

export default function LiveTranslatePage({
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  autoStart,
  onAutoStartConsumed,
  user,
  isSignedIn,
  onSaveSession,
  onGoAbout,
  onGoNewSession,
  onGoSignIn,
  onGoSignUp,
  onGoHistory,
  onGoDashboard,
  onGoSettings,
  onSignOut,
}: {
  sourceLang: string;
  targetLang: string;
  // Set when arriving here from the home page's embedded mic widget (About
  // page) — that widget only picks languages, it can't itself hold a
  // getUserMedia/SpeechRecognition session, so the actual listening starts
  // here on mount instead, making the tap feel instant rather than a
  // separate "arrive, then tap again" step. onAutoStartConsumed lets the
  // parent clear this one-shot flag so navigating back into this page later
  // (e.g. from History) doesn't re-trigger it.
  autoStart?: boolean;
  onAutoStartConsumed?: () => void;
  user: UserAccount | null;
  // Clerk's own signed-in state, distinct from `user` (this app's synced
  // profile) — see Navbar.tsx for why this matters: without it, a signed-in
  // browser whose profile fetch hasn't (yet, or ever) succeeded showed
  // "Sign in"/"Get started" with no way to recover.
  isSignedIn: boolean;
  // Persists a finished session to the signed-in user's real history (see
  // App.tsx's persistSessionToBackend) — used by the "Save to history"
  // choice in the stop-session prompt (see useLiveInterpreter).
  onSaveSession: (pending: PendingConversation) => Promise<boolean>;
  onGoAbout: () => void;
  // Opens the "New Session" naming screen (see App.tsx) — signed-in only,
  // in the header slot the old Live-subtitles icon used to occupy.
  onGoNewSession: () => void;
  onGoSignIn: (conv?: {
    sourceLang: string;
    targetLang: string;
    exchanges: { source: string; translated: string }[];
    summary?: string[];
    nextSteps?: string[];
    speakerSummaries?: { speaker: string; summary: string }[];
  }) => void;
  onGoSignUp: () => void;
  onGoHistory: () => void;
  onGoDashboard: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}) {
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const interpreter = useLiveInterpreter({
    initialSourceLang,
    initialTargetLang,
    user,
    onSaveSession,
  });
  const { sourceLang, targetLang, changeLanguage, swapLanguages, listening, entries, summary, hasContent, startListening } = interpreter;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    // Deferred a tick rather than called directly: React StrictMode's dev-only
    // mount→cleanup→mount dance would otherwise run this effect, then
    // immediately run the unmount-cleanup effect below (stopSpeech/stopGemini),
    // killing the just-started recognition a moment after it starts — the UI
    // would keep showing "Listening…" while the underlying session was
    // already dead. Scheduling the real start past that synchronous dance and
    // cancelling it on the (fake) intervening cleanup avoids the double-fire.
    const timer = setTimeout(() => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      startListening();
      onAutoStartConsumed?.();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col font-['DM_Sans'] z-50 overflow-hidden">
      <style>{`
        @keyframes barPulse {
          0%   { transform: scaleY(0.12); }
          100% { transform: scaleY(1); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.35; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="absolute top-0 left-0 w-48 h-64 opacity-20 pointer-events-none">
        <BotanicalLeft />
      </div>
      <div className="absolute top-0 right-0 w-48 h-64 opacity-20 pointer-events-none scale-x-[-1]">
        <BotanicalLeft />
      </div>

      <div className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-border/40">
        <button onClick={onGoAbout} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-['DM_Sans']">
          Back
        </button>
        <Logo size="text-lg" />
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 -m-1.5"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          {user && (
            <button
              onClick={onGoNewSession}
              aria-label="New session"
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 -m-1.5"
            >
              <Plus size={17} />
            </button>
          )}
          {user ? (
            <>
              <NotificationBell />
              <UserNav user={user} onHistory={onGoHistory} onDashboard={onGoDashboard} onSettings={onGoSettings} onSignOut={onSignOut} />
            </>
          ) : isSignedIn ? (
            <button
              onClick={onSignOut}
              title="Signed in, but your profile couldn't be loaded — try signing out and back in."
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (hasContent) { setShowExitModal(true); }
                  else onGoSignIn();
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={onGoSignUp}
                className="bg-primary text-primary-foreground text-sm px-5 py-2 rounded-full hover:bg-accent transition-colors duration-200 font-medium font-['DM_Sans']"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 pt-8 pb-2">
        <div className="text-center">
          <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Speaking</p>
          <LanguageSelect value={sourceLang} onChange={(lang) => changeLanguage("source", lang)} disabled={listening} />
        </div>
        <button
          onClick={swapLanguages}
          disabled={listening}
          className="flex items-center gap-1 text-muted-foreground/40 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed pb-1 transition-colors duration-150"
          aria-label="Swap languages"
        >
          <div className="w-8 h-px bg-border" />
          <ArrowLeftRight size={12} />
          <div className="w-8 h-px bg-border" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Translating to</p>
          <LanguageSelect value={targetLang} onChange={(lang) => changeLanguage("target", lang)} disabled={listening} />
        </div>
      </div>

      <LiveInterpreterView interpreter={interpreter} />

      {showExitModal && (
        <ExitModal
          hasContent={hasContent}
          onSave={() => {
            setShowExitModal(false);
            const done = entries.filter((e): e is typeof e & { translated: string } => e.status === "done");
            onGoSignIn(
              done.length
                ? {
                    sourceLang,
                    targetLang,
                    exchanges: done.map((e) => ({ source: e.source, translated: e.translated })),
                    summary: summary?.summary,
                    nextSteps: summary?.nextSteps,
                    speakerSummaries: summary?.speakerSummaries,
                  }
                : undefined
            );
          }}
          onDiscard={() => {
            setShowExitModal(false);
            interpreter.clearSession();
          }}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {interpreter.showSaveModal && (
        <SaveSessionModal
          saving={interpreter.savingSession}
          onSave={interpreter.handleSaveSession}
          onDiscard={interpreter.handleDiscardSession}
          onContinue={interpreter.handleContinueSession}
        />
      )}
    </div>
  );
}

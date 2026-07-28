import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Maximize2, Mic, MicOff, Minimize2, RotateCcw } from "lucide-react";
import { UserAccount } from "@/types";
import { LANGUAGE_SPEECH_CODES } from "@/lib/api/utils/constant";
import { quickTranslate, TranslateError } from "@/lib/api/translate";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import Logo from "@/components/ui/common/Logo";
import ExitModal from "@/components/ui/features/translation/ExitModal";
import AudioVisualizer from "@/components/ui/features/translation/AudioVisualizer";
import UserNav from "@/components/ui/layout/UserNav";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";

interface TranscriptEntry {
  id: number;
  source: string;
  translated: string | null;
  status: "translating" | "done" | "error";
}

export default function LiveTranslatePage({
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  user,
  onGoAbout,
  onGoSignIn,
  onGoSignUp,
  onGoHistory,
  onSignOut,
}: {
  sourceLang: string;
  targetLang: string;
  user: UserAccount | null;
  onGoAbout: () => void;
  onGoSignIn: (conv?: { sourceLang: string; targetLang: string; sourceText: string; translatedText: string }) => void;
  onGoSignUp: () => void;
  onGoHistory: () => void;
  onSignOut: () => void;
}) {
  const [sourceLang, setSourceLang] = useState(initialSourceLang);
  const [targetLang, setTargetLang] = useState(initialTargetLang);
  // Interim (not-yet-final) words for the current utterance — shown as a
  // live preview line while the finalized sentences accumulate below.
  const [interimText, setInterimText] = useState("");
  // Every finalized sentence becomes its own entry that translates
  // independently. Fast speech can produce several final utterances before
  // the first one's translation comes back, so entries must never be
  // dropped or overwritten by whichever request happens to resolve last —
  // each is tracked and updated by its own id, and requests fire off
  // concurrently so a slow one can't block the rest from starting.
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "listening">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { listening, start, stop } = useSpeechRecognition();
  const entryIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  // 429s happen when several sentences translate in a burst and the rate
  // limit's short window is briefly exceeded — that's expected during fast
  // continuous speech, not a real failure, so it retries itself with
  // backoff instead of dumping it on the user as a "tap to retry".
  const translateEntry = async (id: number, source: string, attempt = 0) => {
    try {
      const result = await quickTranslate(source, sourceLang, targetLang);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, translated: result.translatedText, status: "done" } : e))
      );
    } catch (err) {
      if (err instanceof TranslateError && err.status === 429 && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        translateEntry(id, source, attempt + 1);
        return;
      }
      setEntries((prev) => (prev.map((e) => (e.id === id ? { ...e, status: "error" } : e))));
    }
  };

  const retryEntry = (entry: TranscriptEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "translating" } : e)));
    translateEntry(entry.id, entry.source);
  };

  const startListening = () => {
    setStatus("listening");
    setInterimText("");
    setErrorMsg(null);

    start(LANGUAGE_SPEECH_CODES[sourceLang] ?? "en-US", {
      onInterim: (transcript) => setInterimText(transcript),
      onFinal: (transcript) => {
        setInterimText("");
        const id = ++entryIdRef.current;
        setEntries((prev) => [...prev, { id, source: transcript, translated: null, status: "translating" }]);
        translateEntry(id, transcript);
      },
      onError: (message) => {
        setErrorMsg(message);
        setStatus("idle");
      },
    });
  };

  const stopListening = () => {
    stop();
    setInterimText("");
    setStatus("idle");
  };

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  const swapLanguages = () => {
    if (listening) return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setEntries([]);
    setInterimText("");
    setErrorMsg(null);
    setStatus("idle");
  };

  // Changing either language mid-session invalidates whatever's already on
  // screen (it was recognized/translated for the old pair), so this clears
  // the transcript the same way swapLanguages does.
  const changeLanguage = (which: "source" | "target", lang: string) => {
    if (which === "source") setSourceLang(lang);
    else setTargetLang(lang);
    setEntries([]);
    setInterimText("");
    setErrorMsg(null);
    setStatus("idle");
  };

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, interimText]);

  const hasContent = entries.length > 0;

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

      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/40">
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
          {user ? (
            <UserNav user={user} onHistory={onGoHistory} onSignOut={onSignOut} />
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

      <div className="relative z-10 flex-1 min-h-0 flex flex-col px-8 md:px-16 lg:px-28">
        {!hasContent && !interimText ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-['Playfair_Display'] text-xl md:text-2xl text-muted-foreground/30 italic select-none text-center">
              {status === "idle" ? "Tap the button below and start speaking…" : "Listening…"}
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-8 flex flex-col gap-6 max-w-2xl mx-auto w-full">
            {entries.map((entry) => (
              <div key={entry.id} style={{ animation: "fadeSlideUp 0.25s ease-out" }}>
                <p className="font-['Playfair_Display'] text-lg md:text-xl text-foreground/80 leading-relaxed">
                  {entry.source}
                </p>
                {entry.status === "translating" ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                ) : entry.status === "error" ? (
                  <button
                    onClick={() => retryEntry(entry)}
                    className="mt-1.5 flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <RotateCcw size={13} /> Translation failed — tap to retry
                  </button>
                ) : (
                  <p className="font-['Playfair_Display'] font-bold italic text-xl md:text-2xl text-accent leading-relaxed mt-1">
                    {entry.translated}
                  </p>
                )}
              </div>
            ))}
            {interimText && (
              <p className="font-['Playfair_Display'] text-lg md:text-xl text-foreground/50 leading-relaxed italic">
                {interimText}
                <span className="inline-block w-[2px] h-5 bg-muted-foreground/50 ml-1 align-middle animate-pulse rounded-full" />
              </p>
            )}
          </div>
        )}
      </div>

      {showExitModal && (
        <ExitModal
          hasContent={hasContent}
          onSave={() => {
            setShowExitModal(false);
            const done = entries.filter((e): e is TranscriptEntry & { translated: string } => e.status === "done");
            onGoSignIn(
              done.length
                ? {
                    sourceLang,
                    targetLang,
                    sourceText: done.map((e) => e.source).join("\n"),
                    translatedText: done.map((e) => e.translated).join("\n"),
                  }
                : undefined
            );
          }}
          onDiscard={() => {
            setShowExitModal(false);
            setEntries([]);
            setInterimText("");
            setStatus("idle");
          }}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      <div className="relative z-10 border-t border-border/40 bg-secondary/50 px-8 md:px-20 py-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <AudioVisualizer listening={listening} />
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={toggleListening}
              className="relative w-20 h-20 rounded-full flex items-center justify-center focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95"
              style={{ background: listening ? "#1C1612" : "#C85A3A" }}
            >
              {listening && (
                <>
                  <span className="absolute inset-0 rounded-full" style={{ background: "#C85A3A", animation: "ripple 1.4s ease-out infinite" }} />
                  <span className="absolute inset-0 rounded-full" style={{ background: "#C85A3A", animation: "ripple 1.4s ease-out 0.5s infinite" }} />
                </>
              )}
              {listening ? <MicOff size={26} className="text-white relative z-10" /> : <Mic size={26} className="text-white relative z-10" />}
            </button>
            <p className="text-xs font-['DM_Mono'] text-muted-foreground tracking-[0.15em] uppercase">
              {status === "listening" ? "listening — tap to stop" : "tap to speak"}
            </p>
            {errorMsg && (
              <p className="text-xs text-destructive text-center max-w-xs" role="alert">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
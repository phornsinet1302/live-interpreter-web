import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, ListChecks, Maximize2, Mic, MicOff, Minimize2, RotateCcw, Sparkles } from "lucide-react";
import { UserAccount } from "@/types";
import { LANGUAGE_SPEECH_CODES } from "@/lib/api/utils/constant";
import { quickTranslate, TranslateError } from "@/lib/api/translate";
import { summarizeConversation, type SummaryResult } from "@/lib/api/summarize";
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
  onGoProfile,
  onSignOut,
}: {
  sourceLang: string;
  targetLang: string;
  user: UserAccount | null;
  onGoAbout: () => void;
  onGoSignIn: (conv?: {
    sourceLang: string;
    targetLang: string;
    sourceText: string;
    translatedText: string;
    summary?: string[];
    nextSteps?: string[];
  }) => void;
  onGoSignUp: () => void;
  onGoHistory: () => void;
  onGoProfile: () => void;
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
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const { listening, start, stop } = useSpeechRecognition();
  const entryIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Mirrors `entries` for reading fresh values inside async waits below,
  // without pulling `entries` into those closures' dependency chain.
  const entriesRef = useRef<TranscriptEntry[]>([]);
  entriesRef.current = entries;
  // Bumped every time a new session starts (mic tapped on) so a summary
  // request from a stopped session that's still in flight can't land after
  // the user has already resumed talking or started over.
  const summarySeqRef = useRef(0);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  const finishAndSummarize = async () => {
    const seq = summarySeqRef.current;
    // A sentence or two can still be mid-translation right when the user
    // taps stop — wait briefly for those to settle so the summary covers
    // everything that was said, not just whatever finished first.
    for (let i = 0; i < 30; i++) {
      if (!entriesRef.current.some((e) => e.status === "translating")) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (seq !== summarySeqRef.current) return;

    const done = entriesRef.current.filter((e): e is TranscriptEntry & { translated: string } => e.status === "done");
    if (!done.length) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const result = await summarizeConversation(
        done.map((e) => ({ source: e.source, translated: e.translated })),
        sourceLang,
        targetLang
      );
      if (seq !== summarySeqRef.current) return;
      setSummary(result);
    } catch {
      if (seq !== summarySeqRef.current) return;
      setSummaryError("Couldn't generate a summary — please try again.");
    } finally {
      if (seq === summarySeqRef.current) setSummarizing(false);
    }
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
    // Resuming after a summary was already shown (or one was still being
    // generated) makes it stale — it'll be regenerated next time they stop.
    summarySeqRef.current++;
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);

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
    if (entriesRef.current.length > 0) finishAndSummarize();
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
    summarySeqRef.current++;
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);
  };

  // Changing either language mid-session invalidates whatever's already on
  // screen (it was recognized/translated for the old pair), so this clears
  // the transcript the same way swapLanguages does.
  const changeLanguage = (which: "source" | "target", lang: string) => {
    if (which === "source") setSourceLang(lang);
    else setTargetLang(lang);
    summarySeqRef.current++;
    setEntries([]);
    setInterimText("");
    setErrorMsg(null);
    setStatus("idle");
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);
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
  }, [entries, interimText, summary]);

  const hasContent = entries.length > 0;

  return (
    <div className="fixed inset-0 bg-background flex flex-col font-['DM_Sans'] z-50 ">
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
            <UserNav user={user} onHistory={onGoHistory} onProfile={onGoProfile} onSignOut={onSignOut} />
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

      <div className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row gap-2 md:gap-8 px-8 md:px-12 lg:px-20 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
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

        {/* Summary sidebar — sits alongside the transcript on desktop
            (its own scroll, doesn't get pushed around when the transcript
            scrolls) and stacks below it on narrow screens. */}
        {(summarizing || summary || summaryError) && (
          <div
            className="md:w-[340px] lg:w-[380px] flex-shrink-0 min-h-0 flex flex-col py-4 md:py-8"
            style={{ animation: "fadeSlideUp 0.3s ease-out" }}
          >
            <div className="rounded-3xl border border-border/60 bg-card shadow-sm p-6 flex flex-col gap-5 min-h-0 overflow-y-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={15} className="text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-['Playfair_Display'] font-bold text-base text-foreground leading-tight">Session Summary</p>
                  <p className="text-[10px] font-['DM_Mono'] tracking-[0.1em] uppercase text-muted-foreground truncate">
                    {sourceLang} → {targetLang}
                  </p>
                </div>
              </div>

              {summarizing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </span>
                  Summarizing your conversation…
                </div>
              )}

              {summaryError && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive" role="alert">
                    {summaryError}
                  </p>
                  <button
                    onClick={finishAndSummarize}
                    className="self-start flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    <RotateCcw size={13} /> Try again
                  </button>
                </div>
              )}

              {summary && (
                <>
                  <div>
                    <p className="text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2.5">
                      What was discussed
                    </p>
                    <ul className="flex flex-col gap-2">
                      {summary.summary.map((point, i) => (
                        <li key={i} className="text-sm text-foreground/80 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-accent">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-accent mb-2.5">
                      <ListChecks size={13} /> Next steps
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {summary.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                          <span className="w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
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
                    summary: summary?.summary,
                    nextSteps: summary?.nextSteps,
                  }
                : undefined
            );
          }}
          onDiscard={() => {
            setShowExitModal(false);
            setEntries([]);
            setInterimText("");
            setStatus("idle");
            summarySeqRef.current++;
            setSummary(null);
            setSummaryError(null);
            setSummarizing(false);
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
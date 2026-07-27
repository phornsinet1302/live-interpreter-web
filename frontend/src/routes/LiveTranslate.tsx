import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Mic, MicOff } from "lucide-react";
import { UserAccount } from "@/types";
import { DEMO_PHRASES, DEMO_TRANSLATIONS } from "@/lib/api/utils/constant";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import Logo from "@/components/ui/common/Logo";
import ExitModal from "@/components/ui/features/translation/ExitModal";
import AudioVisualizer from "@/components/ui/features/translation/AudioVisualizer";
import UserNav from "@/components/ui/layout/UserNav";

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
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "translating" | "done">("idle");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTranslation = (phrase: string, idx: number) => {
    const list = DEMO_TRANSLATIONS[targetLang];
    if (list) return list[idx % list.length];
    return `[${targetLang} translation]: ${phrase}`;
  };

  const startListening = () => {
    setListening(true);
    setStatus("listening");
    setSpokenText("");
    setTranslatedText("");
    const phrase = DEMO_PHRASES[phraseIndex % DEMO_PHRASES.length];
    const words = phrase.split(" ");
    let wordIdx = 0;
    intervalRef.current = setInterval(() => {
      wordIdx++;
      setSpokenText(words.slice(0, wordIdx).join(" "));
      if (wordIdx >= words.length) {
        clearInterval(intervalRef.current!);
        setStatus("translating");
        timeoutRef.current = setTimeout(() => {
          setTranslatedText(getTranslation(phrase, phraseIndex % DEMO_PHRASES.length));
          setStatus("done");
          setListening(false);
          setPhraseIndex((p) => p + 1);
        }, 900);
      }
    }, 160);
  };

  const stopListening = () => {
    clearInterval(intervalRef.current!);
    clearTimeout(timeoutRef.current!);
    setListening(false);
    setStatus("idle");
  };

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  const swapLanguages = () => {
    if (listening || status === "translating") return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSpokenText("");
    setTranslatedText("");
    setStatus("idle");
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(timeoutRef.current!);
    };
  }, []);

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
          {user ? (
            <UserNav user={user} onHistory={onGoHistory} onSignOut={onSignOut} />
          ) : (
            <>
              <button
                onClick={() => {
                  if (spokenText || translatedText) { setShowExitModal(true); }
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
          <p className="font-['Playfair_Display'] font-bold text-base text-foreground">{sourceLang}</p>
        </div>
        <button
          onClick={swapLanguages}
          disabled={listening || status === "translating"}
          className="flex items-center gap-1 text-muted-foreground/40 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed pb-1 transition-colors duration-150"
          aria-label="Swap languages"
        >
          <div className="w-8 h-px bg-border" />
          <ArrowLeftRight size={12} />
          <div className="w-8 h-px bg-border" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-['DM_Mono'] tracking-[0.2em] uppercase text-muted-foreground mb-0.5">Translating to</p>
          <p className="font-['Playfair_Display'] font-bold text-base text-accent">{targetLang}</p>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 md:px-28 gap-8">
        <div className="w-full max-w-2xl text-center min-h-[72px] flex items-center justify-center">
          {spokenText ? (
            <p className="font-['Playfair_Display'] text-2xl md:text-3xl text-foreground/80 leading-relaxed" style={{ animation: "fadeSlideUp 0.25s ease-out" }}>
              {spokenText}
              {listening && (
                <span className="inline-block w-[2px] h-6 bg-muted-foreground/50 ml-1 align-middle animate-pulse rounded-full" />
              )}
            </p>
          ) : (
            <p className="font-['Playfair_Display'] text-xl md:text-2xl text-muted-foreground/30 italic select-none">
              {status === "idle" ? "Tap the button below and start speaking…" : "Listening…"}
            </p>
          )}
        </div>
        <div className="w-full max-w-xl flex items-center gap-4">
          <div className="flex-1 h-px bg-border/60" />
          <div className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        <div className="w-full max-w-2xl text-center min-h-[72px] flex items-center justify-center">
          {status === "translating" && !translatedText ? (
            <div className="flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          ) : translatedText ? (
            <p className="font-['Playfair_Display'] font-bold italic text-2xl md:text-4xl text-accent leading-relaxed" style={{ animation: "fadeSlideUp 0.35s ease-out" }}>
              {translatedText}
            </p>
          ) : (
            <p className="font-['Playfair_Display'] text-xl md:text-2xl text-muted-foreground/20 italic select-none">
              Translation appears here
            </p>
          )}
        </div>
      </div>

      {showExitModal && (
        <ExitModal
          hasContent={!!(spokenText || translatedText)}
          onSave={() => {
            setShowExitModal(false);
            onGoSignIn(
              spokenText && translatedText
                ? { sourceLang, targetLang, sourceText: spokenText, translatedText }
                : undefined
            );
          }}
          onDiscard={() => {
            setShowExitModal(false);
            setSpokenText("");
            setTranslatedText("");
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
              {status === "listening" ? "listening — tap to stop" : status === "translating" ? "translating…" : status === "done" ? "tap to speak again" : "tap to speak"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
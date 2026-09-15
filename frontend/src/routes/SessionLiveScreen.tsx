import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Expand, Palette, Shrink } from "lucide-react";
import { UserAccount } from "@/types";
import type { PendingConversation } from "@/App";
import { useLiveInterpreter } from "@/hooks/useLiveInterpreter";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import SaveSessionModal from "@/components/ui/features/translation/SaveSessionModal";
import LiveInterpreterView, { type TranscriptFontFamily } from "@/components/ui/features/translation/LiveInterpreterView";
import UserNav from "@/components/ui/layout/UserNav";
import NotificationBell from "@/components/ui/layout/NotificationBell";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";

const MIN_FONT_SCALE = 80;
const MAX_FONT_SCALE = 200;
const FONT_SCALE_STEP = 10;

const FONT_FAMILY_OPTIONS: { id: TranscriptFontFamily; label: string }[] = [
  { id: "elegant", label: "Elegant" },
  { id: "clean", label: "Clean" },
  { id: "bold", label: "Bold" },
];

type BackgroundPreset = "default" | "dark" | "light" | "sepia";

// Each preset overrides the same CSS custom properties theme.css defines
// (see :root/.dark there) — every Tailwind class in this screen and in
// LiveInterpreterView already renders from these variables (bg-background,
// text-foreground, text-accent, etc.), so setting them here on the screen's
// own root cascades correctly to everything inside it without needing to
// touch each element individually, and doesn't affect Home or any other
// screen, which never sets them.
const BACKGROUND_PRESETS: Record<BackgroundPreset, { label: string; swatch: string; vars?: CSSProperties }> = {
  default: { label: "Default", swatch: "linear-gradient(135deg, #F7F3EB 50%, #1C1612 50%)" },
  dark: {
    label: "Dark",
    swatch: "#141110",
    vars: {
      "--background": "#141110",
      "--foreground": "#FDFAF4",
      "--card": "#1C1612",
      "--secondary": "#2A231D",
      "--muted": "#2A231D",
      "--muted-foreground": "#B8AFA0",
      "--accent": "#E08A6B",
      "--accent-foreground": "#1C1612",
      "--border": "rgba(253, 250, 244, 0.15)",
    } as CSSProperties,
  },
  light: {
    label: "Light",
    swatch: "#FFFFFF",
    vars: {
      "--background": "#FFFFFF",
      "--foreground": "#1C1612",
      "--card": "#FAFAFA",
      "--secondary": "#F0F0F0",
      "--muted": "#EDEDED",
      "--muted-foreground": "#6B6B6B",
      "--accent": "#C85A3A",
      "--accent-foreground": "#FFFFFF",
      "--border": "rgba(0, 0, 0, 0.1)",
    } as CSSProperties,
  },
  sepia: {
    label: "Sepia",
    swatch: "#F4ECD8",
    vars: {
      "--background": "#F4ECD8",
      "--foreground": "#3B2F1E",
      "--card": "#FBF6EA",
      "--secondary": "#EADFC5",
      "--muted": "#E7DBC0",
      "--muted-foreground": "#8A7859",
      "--accent": "#A9542F",
      "--accent-foreground": "#FBF6EA",
      "--border": "rgba(59, 47, 30, 0.15)",
    } as CSSProperties,
  },
};

// The live-interpreter screen for a named "New Session" (see App.tsx and
// NewSessionScreen). Runs the exact same mic/translate/speaker-identify
// engine as Home (routes/LiveTranslate.tsx) via useLiveInterpreter, so the
// two never drift apart — what's different here is purely this screen's own
// chrome: the session name in the header instead of Home's auto title, a
// font-size control for the transcript, a focus mode that hides this
// header/language row (not the real browser Fullscreen API Home's own
// expand icon uses) down to just the transcript and mic button, and (this
// screen only, not Home) a display-settings popover for the transcript's
// font style and the screen's background preset.
export default function SessionLiveScreen({
  sessionName,
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  user,
  onSaveSession,
  onGoBack,
  onGoHistory,
  onGoDashboard,
  onGoSettings,
  onSignOut,
}: {
  sessionName: string;
  sourceLang: string;
  targetLang: string;
  user: UserAccount;
  onSaveSession: (pending: PendingConversation) => Promise<boolean>;
  onGoBack: () => void;
  onGoHistory: () => void;
  onGoDashboard: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}) {
  const [fontScale, setFontScale] = useState(100);
  const [focusMode, setFocusMode] = useState(false);
  const [fontFamily, setFontFamily] = useState<TranscriptFontFamily>("elegant");
  const [background, setBackground] = useState<BackgroundPreset>("default");
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const displaySettingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (displaySettingsRef.current && !displaySettingsRef.current.contains(e.target as Node)) {
        setDisplaySettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const interpreter = useLiveInterpreter({
    initialSourceLang,
    initialTargetLang,
    user,
    onSaveSession,
    sessionTitle: sessionName,
  });
  const { sourceLang, targetLang, changeLanguage, swapLanguages, listening } = interpreter;

  const decreaseFontScale = () => setFontScale((s) => Math.max(MIN_FONT_SCALE, s - FONT_SCALE_STEP));
  const increaseFontScale = () => setFontScale((s) => Math.min(MAX_FONT_SCALE, s + FONT_SCALE_STEP));

  const rootStyle = BACKGROUND_PRESETS[background].vars;

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col font-['DM_Sans'] z-50 overflow-hidden transition-colors duration-200"
      style={rootStyle}
    >
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

      {focusMode ? (
        <button
          onClick={() => setFocusMode(false)}
          aria-label="Exit focus mode"
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-card/90 border border-border/60 text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          <Shrink size={15} />
        </button>
      ) : (
        <>
          <div className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-border/40">
            <button onClick={onGoBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-['DM_Sans']">
              Back
            </button>
            <p className="font-['Playfair_Display'] font-bold text-base text-foreground truncate max-w-[40%]">{sessionName}</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-border px-1 py-1">
                <button
                  onClick={decreaseFontScale}
                  disabled={fontScale <= MIN_FONT_SCALE}
                  aria-label="Decrease text size"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  A-
                </button>
                <span className="text-[10px] font-['DM_Mono'] text-muted-foreground w-9 text-center">{fontScale}%</span>
                <button
                  onClick={increaseFontScale}
                  disabled={fontScale >= MAX_FONT_SCALE}
                  aria-label="Increase text size"
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  A+
                </button>
              </div>
              <div className="relative" ref={displaySettingsRef}>
                <button
                  onClick={() => setDisplaySettingsOpen((o) => !o)}
                  aria-label="Font and background settings"
                  className={`transition-colors p-1.5 -m-1.5 ${displaySettingsOpen ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Palette size={17} />
                </button>
                {displaySettingsOpen && (
                  <div
                    className="absolute right-0 top-full mt-3 w-64 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50 p-4 flex flex-col gap-4"
                    style={{ animation: "fadeSlideUp 0.2s ease-out" }}
                  >
                    <div>
                      <p className="text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2">
                        Font style
                      </p>
                      <div className="flex items-center gap-1 rounded-full border border-border p-1 w-fit">
                        {FONT_FAMILY_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setFontFamily(opt.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              fontFamily === opt.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2">
                        Background
                      </p>
                      <div className="flex items-center gap-3">
                        {(Object.keys(BACKGROUND_PRESETS) as BackgroundPreset[]).map((id) => (
                          <button
                            key={id}
                            onClick={() => setBackground(id)}
                            aria-label={BACKGROUND_PRESETS[id].label}
                            title={BACKGROUND_PRESETS[id].label}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                              background === id ? "border-accent" : "border-border"
                            }`}
                            style={{ background: BACKGROUND_PRESETS[id].swatch }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setFocusMode(true)}
                aria-label="Enter focus mode"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 -m-1.5"
              >
                <Expand size={17} />
              </button>
              <NotificationBell />
              <UserNav user={user} onHistory={onGoHistory} onDashboard={onGoDashboard} onSettings={onGoSettings} onSignOut={onSignOut} />
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
        </>
      )}

      <LiveInterpreterView interpreter={interpreter} fontScale={fontScale} fontFamily={fontFamily} focusMode={focusMode} />

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

import { ListChecks, Mic, MicOff, Pencil, RotateCcw, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import type { LiveInterpreter, TranscriptEntry } from "@/hooks/useLiveInterpreter";
import AudioVisualizer from "./AudioVisualizer";

// Curated font choices for the transcript text (the named session screen's
// display-settings popover) — all three are already loaded app-wide (see
// styles/fonts.css), so picking one never triggers an extra font fetch.
export type TranscriptFontFamily = "elegant" | "clean" | "bold";
const TRANSCRIPT_FONT_STACKS: Record<TranscriptFontFamily, string> = {
  elegant: "'Playfair Display', Georgia, serif",
  clean: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  bold: "'Baloo 2', -apple-system, BlinkMacSystemFont, sans-serif",
};

// Renders the body Home already has — speaker chips, the live transcript,
// the end-of-session summary sidebar, live next-step suggestions, and the
// mic/visualizer footer — driven entirely by a useLiveInterpreter() instance,
// so this same view is used unmodified by both Home (routes/LiveTranslate.tsx)
// and the named session screen (routes/SessionLiveScreen.tsx).
export default function LiveInterpreterView({
  interpreter,
  // 80-200, scales only the source/translated transcript text (the "New
  // Session" screen's A-/A+ control) — left at 100 (the default), rendering
  // is byte-identical to before this component existed.
  fontScale = 100,
  // Overrides only the source/translated transcript text's font — left
  // undefined (the default), rendering is byte-identical to before this
  // prop existed (Home never passes it).
  fontFamily,
  // Suppresses the speaker chips, summary sidebar, and next-steps panel,
  // leaving just the transcript and the mic footer — used by the named
  // session screen's focus/full-screen mode.
  focusMode = false,
}: {
  interpreter: LiveInterpreter;
  fontScale?: number;
  fontFamily?: TranscriptFontFamily;
  focusMode?: boolean;
}) {
  const {
    entries,
    interimText,
    speaking,
    status,
    hasContent,
    scrollRef,
    retryEntry,
    speakers,
    editingSpeakerId,
    editingName,
    setEditingName,
    startRenameSpeaker,
    commitRenameSpeaker,
    cancelRenameSpeaker,
    removeSpeaker,
    summarizing,
    summary,
    summaryError,
    finishAndSummarize,
    sourceLang,
    targetLang,
    nextStepSuggestions,
    listening,
    toggleListening,
    usesGeminiTranscription,
    errorMsg,
  } = interpreter;

  const fontFamilyStack = fontFamily ? TRANSCRIPT_FONT_STACKS[fontFamily] : undefined;
  const sourceTextStyle =
    fontScale !== 100 || fontFamilyStack
      ? { fontSize: fontScale !== 100 ? `${1.125 * (fontScale / 100)}rem` : undefined, fontFamily: fontFamilyStack }
      : undefined;
  const translatedTextStyle =
    fontScale !== 100 || fontFamilyStack
      ? { fontSize: fontScale !== 100 ? `${1.25 * (fontScale / 100)}rem` : undefined, fontFamily: fontFamilyStack }
      : undefined;

  return (
    <>
      {/* Speaker identification (FR-8): automatically detected from voice
          pitch as each utterance finishes — nothing to select beforehand.
          Rename a chip to correct a label or give someone their real name;
          remove one to drop a mis-detected phantom speaker. */}
      {!focusMode && speakers.length > 0 && (
        <div className="relative z-10 flex items-center justify-center gap-2 flex-wrap px-8 pb-3">
          {speakers.map((speaker) =>
            editingSpeakerId === speaker.id ? (
              <input
                key={speaker.id}
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitRenameSpeaker}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRenameSpeaker();
                  if (e.key === "Escape") cancelRenameSpeaker();
                }}
                className="h-7 w-28 rounded-full border px-3 text-xs font-['DM_Sans'] bg-card focus:outline-none"
                style={{ borderColor: speaker.color }}
              />
            ) : (
              <div
                key={speaker.id}
                className="group flex items-center gap-1.5 h-7 rounded-full border px-3 text-xs font-['DM_Sans']"
                style={{ borderColor: speaker.color, color: speaker.color }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: speaker.color }} />
                {speaker.name}
                <button
                  onClick={() => startRenameSpeaker(speaker)}
                  aria-label={`Rename ${speaker.name}`}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => removeSpeaker(speaker.id)}
                  aria-label={`Remove ${speaker.name}`}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
              </div>
            )
          )}
        </div>
      )}

      <div className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row gap-2 md:gap-8 px-8 md:px-12 lg:px-20">
        <div className="flex-1 min-h-0 flex flex-col">
          {!hasContent && !interimText && !speaking ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-['Playfair_Display'] text-xl md:text-2xl text-muted-foreground/30 italic select-none text-center">
                {status === "idle" ? "Tap the button below and start speaking…" : "Listening…"}
              </p>
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-8 flex flex-col gap-6 max-w-2xl mx-auto w-full">
              {entries.map((entry: TranscriptEntry) => (
                <div key={entry.id} style={{ animation: "fadeSlideUp 0.25s ease-out" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.speakerColor }} />
                    <span
                      className="text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase"
                      style={{ color: entry.speakerColor }}
                    >
                      {entry.speakerName}
                    </span>
                  </div>
                  {entry.status === "transcribing" ? (
                    <div className="flex items-center gap-1.5">
                      <p className="font-['Playfair_Display'] text-lg md:text-xl text-muted-foreground/60 italic">
                        Transcribing…
                      </p>
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <p
                        className="font-['Playfair_Display'] text-lg md:text-xl text-foreground/80 leading-relaxed"
                        style={sourceTextStyle}
                      >
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
                          <RotateCcw size={13} />
                          {entry.errorStage === "transcription" ? "Transcription failed — tap to retry" : "Translation failed — tap to retry"}
                        </button>
                      ) : (
                        <p
                          className="font-['Playfair_Display'] font-bold italic text-xl md:text-2xl text-accent leading-relaxed mt-1"
                          style={translatedTextStyle}
                        >
                          {entry.translated}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
              {interimText && (
                // No speaker label here — attribution only happens once the
                // utterance finalizes and its pitch can actually be read
                // (see detectSpeaker), so showing one now would be a guess.
                <p className="font-['Playfair_Display'] text-lg md:text-xl text-foreground/50 leading-relaxed italic" style={sourceTextStyle}>
                  {interimText}
                  <span className="inline-block w-[2px] h-5 bg-muted-foreground/50 ml-1 align-middle animate-pulse rounded-full" />
                </p>
              )}
              {speaking && (
                <p className="font-['Playfair_Display'] text-lg md:text-xl text-muted-foreground/50 leading-relaxed italic">
                  Listening…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Summary sidebar — sits alongside the transcript on desktop
            (its own scroll, doesn't get pushed around when the transcript
            scrolls) and stacks below it on narrow screens. */}
        {!focusMode && (summarizing || summary || summaryError) && (
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

                  {summary.speakerSummaries.length > 0 && (
                    <>
                      <div className="h-px bg-border/50" />
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2.5">
                          <Users size={13} /> Speaker summary
                        </p>
                        <div className="flex flex-col gap-3">
                          {summary.speakerSummaries.map((s, i) => (
                            <div key={i}>
                              <p className="text-xs font-semibold text-foreground mb-0.5">{s.speaker}</p>
                              <p className="text-sm text-foreground/80 leading-relaxed">{s.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!focusMode && listening && nextStepSuggestions.length > 0 && (
          <div className="flex md:w-72 lg:w-80 flex-shrink-0 flex-col md:pt-8 pb-4 md:pb-0">
            <div
              className="flex flex-col gap-1.5 px-4 py-3 rounded-2xl border border-border/60 bg-card text-sm text-foreground/80 shadow-sm"
              style={{ animation: "fadeSlideUp 0.25s ease-out" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground">
                <Sparkles size={12} className="text-accent flex-shrink-0" />
                Next steps
              </div>
              {nextStepSuggestions.map((step, i) => (
                <p key={i} className="pl-1">
                  {step}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

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
              {listening ? <Mic size={26} className="text-white relative z-10" /> : <MicOff size={26} className="text-white relative z-10" />}
            </button>
            <p className="text-xs font-['DM_Mono'] text-muted-foreground tracking-[0.15em] uppercase">
              {status === "listening" ? "listening — tap to stop" : "tap to speak"}
            </p>
            {usesGeminiTranscription && (
              <p
                className="flex items-center gap-1.5 text-[10px] font-['DM_Mono'] text-muted-foreground/60 tracking-[0.1em] uppercase"
                title="Echo cancellation, background noise suppression, and low-frequency rumble filtering are applied to your mic audio before it's transcribed."
              >
                <ShieldCheck size={11} className="text-accent/70" />
                Noise cancellation on
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-destructive text-center max-w-xs" role="alert">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

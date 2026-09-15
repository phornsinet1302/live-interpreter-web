import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserAccount } from "@/types";
import type { PendingConversation } from "@/App";
import { GEMINI_TRANSCRIPTION_LANGUAGES, LANGUAGE_SPEECH_CODES, SPEAKER_COLORS } from "@/lib/api/utils/constant";
import { quickTranslate, TranslateError } from "@/lib/api/translate";
import { transcribeAudio, TranscribeError } from "@/lib/api/transcribe";
import { summarizeConversation, type SummaryResult } from "@/lib/api/summarize";
import { getNextStep } from "@/lib/api/nextStep";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useGeminiTranscription } from "@/hooks/useGeminiTranscription";
import { matchOrCreateSpeaker, type DetectedSpeaker } from "@/lib/speakerDetection";

// Minimum time between live "next step" suggestion calls, so fast
// back-to-back sentences don't each spend a Gemini call.
const MIN_NEXT_STEP_INTERVAL_MS = 15000;

export interface TranscriptEntry {
  id: number;
  // "" while status === "transcribing" — the Gemini path (see
  // GEMINI_TRANSCRIPTION_LANGUAGES) doesn't have text until the audio
  // segment's transcription round trip completes.
  source: string;
  translated: string | null;
  status: "transcribing" | "translating" | "done" | "error";
  // Only meaningful when status === "error" — which network call retryEntry
  // should re-run.
  errorStage?: "transcription" | "translation";
  // Gemini path only: kept until transcription succeeds, so a transcription
  // failure can retry the original audio instead of needing new speech.
  audioBlob?: Blob;
  audioMimeType?: string;
  // Snapshot of whoever was the active speaker when this entry was created —
  // stored on the entry itself (not looked up live from `speakers`) so
  // renaming or removing a participant later never rewrites history.
  speakerId: string;
  speakerName: string;
  speakerColor: string;
}

// Shared mic → transcribe → translate → speaker-ID → summarize engine behind
// both the Home screen (routes/LiveTranslate.tsx) and the named "New Session"
// screen (routes/SessionLiveScreen.tsx), so the two stay in sync instead of
// carrying separate copies of this logic. Screen-specific concerns (real
// browser Fullscreen API on Home vs. the in-page focus mode on the session
// screen, and Home's autoStart-on-arrival effect) intentionally live in the
// screens themselves, not here.
export function useLiveInterpreter({
  initialSourceLang,
  initialTargetLang,
  user,
  onSaveSession,
  sessionTitle,
}: {
  initialSourceLang: string;
  initialTargetLang: string;
  user: UserAccount | null;
  // Persists a finished session to the signed-in user's real history — used
  // by the "Save to history" choice in the stop-session prompt below.
  onSaveSession: (pending: PendingConversation) => Promise<boolean>;
  // Overrides the saved session's title (e.g. the name given on
  // NewSessionScreen). Left undefined, the backend/frontend default
  // ("Live Translation Session") applies, matching Home's existing behavior.
  sessionTitle?: string;
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
  // Shown when a signed-in user taps the mic to stop a session that has
  // content (see stopListening) — the guest "sign in to save" prompt is a
  // separate, screen-level concern (see ExitModal in LiveTranslate.tsx).
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  // True while the Gemini VAD path (see useGeminiTranscription) has detected
  // active speech but the segment hasn't finalized/transcribed yet — there's
  // no word-by-word preview like the Web Speech API's interimText, so this
  // just drives a "Listening…" placeholder instead.
  const [speaking, setSpeaking] = useState(false);
  // Live, mid-session "what to say next" suggestions — the same multi-item
  // list style as the end-of-session Summary panel's Next Steps, just
  // recomputed while the mic is still open instead of only appearing once
  // the session ends. Refreshes as new sentences finish, so it tracks the
  // conversation as it moves — but no more than once per
  // MIN_NEXT_STEP_INTERVAL_MS, so fast back-to-back sentences don't each
  // burn a Gemini call.
  const [nextStepSuggestions, setNextStepSuggestions] = useState<string[]>([]);
  // How many "done" entries existed the last time a suggestion was actually
  // generated — guards against regenerating for content already covered.
  const lastNextStepDoneCountRef = useRef(0);
  // When the last suggestion call actually fired (0 = never this session).
  const lastNextStepCallAtRef = useRef(0);
  // Bumped on every updateNextStep() call so a slow, older request can't
  // overwrite a newer suggestion if responses arrive out of order.
  const nextStepSeqRef = useRef(0);
  const { listening: speechListening, start, stop: stopSpeech } = useSpeechRecognition();
  const {
    listening: geminiListening,
    start: startGemini,
    stop: stopGemini,
    getAveragePitchSince: getGeminiPitchSince,
  } = useGeminiTranscription();
  const usesGeminiTranscription = GEMINI_TRANSCRIPTION_LANGUAGES.has(sourceLang);
  const listening = usesGeminiTranscription ? geminiListening : speechListening;
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

  // Automatic speaker identification (FR-8) — detected from voice pitch as
  // each utterance finishes, not manually selected. See
  // lib/speakerDetection.ts for the matching heuristic (and its known
  // limits: two similarly-pitched speakers of the same gender may still get
  // grouped together). Pitch is only available on the Gemini transcription
  // path, which already holds a mic stream for recording — reusing its
  // existing analyser (see useGeminiTranscription's getAveragePitchSince)
  // means detection never opens a second, independent getUserMedia stream.
  // A second concurrent mic open was tried here previously and silently
  // starved the Web Speech API's own internal audio capture on real
  // hardware (undetectable in headless testing against a fake device), so
  // the Web Speech path intentionally gets no pitch signal at all and
  // relies on matchOrCreateSpeaker's "fall back to whoever spoke last"
  // behavior when passed pitch === null.
  const [speakers, setSpeakers] = useState<DetectedSpeaker[]>([]);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  // Source of truth for the onFinal/onSegmentReady closures below (created
  // once per listening session — see startListening), which need to read
  // AND write the current speaker roster synchronously rather than through
  // React state's async updates.
  const speakersRef = useRef<DetectedSpeaker[]>([]);
  const lastSpeakerIdRef = useRef<string | undefined>(undefined);
  // Marks the start of "audio that belongs to the utterance about to
  // finish" — reset to now() every time an utterance is attributed, so the
  // next one's pitch is only averaged over its own window.
  const utteranceWindowStartRef = useRef(Date.now());

  // Called once per finalized utterance (both transcription paths) to
  // attribute it to a speaker — see the two onFinal/onSegmentReady call
  // sites in startListening.
  const detectSpeaker = (): DetectedSpeaker => {
    const windowStart = utteranceWindowStartRef.current;
    utteranceWindowStartRef.current = Date.now();
    const pitch = usesGeminiTranscription ? getGeminiPitchSince(windowStart) : null;
    const { speakers: updated, matchedId } = matchOrCreateSpeaker(
      speakersRef.current,
      pitch,
      SPEAKER_COLORS,
      lastSpeakerIdRef.current
    );
    speakersRef.current = updated;
    lastSpeakerIdRef.current = matchedId;
    setSpeakers(updated);
    return updated.find((s) => s.id === matchedId)!;
  };

  // Drops a mis-detected phantom speaker (e.g. a noise blip that got
  // clustered as its own voice) from the roster going forward — doesn't
  // rewrite past transcript lines, which keep whatever they were tagged
  // with at the time (see TranscriptEntry's speakerName/speakerColor).
  const removeSpeaker = (id: string) => {
    const updated = speakers.filter((s) => s.id !== id);
    speakersRef.current = updated;
    setSpeakers(updated);
  };

  const startRenameSpeaker = (speaker: DetectedSpeaker) => {
    setEditingSpeakerId(speaker.id);
    setEditingName(speaker.name);
  };

  const cancelRenameSpeaker = () => setEditingSpeakerId(null);

  const commitRenameSpeaker = () => {
    const id = editingSpeakerId;
    const name = editingName.trim();
    setEditingSpeakerId(null);
    if (!id || !name) return;
    const updated = speakers.map((s) => (s.id === id ? { ...s, name } : s));
    speakersRef.current = updated;
    setSpeakers(updated);
  };

  // Returns the summary it computed (not just setting state) so a caller
  // that needs it immediately — the "Save to history" flow below — doesn't
  // hit the classic stale-closure trap of reading `summary` state back out
  // in the same render pass right after the setSummary() that produced it.
  const finishAndSummarize = async (): Promise<SummaryResult | null> => {
    const seq = summarySeqRef.current;
    // A sentence or two can still be mid-translation right when the user
    // taps stop — wait briefly for those to settle so the summary covers
    // everything that was said, not just whatever finished first.
    for (let i = 0; i < 30; i++) {
      if (!entriesRef.current.some((e) => e.status === "translating" || e.status === "transcribing")) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (seq !== summarySeqRef.current) return null;

    const done = entriesRef.current.filter((e): e is TranscriptEntry & { translated: string } => e.status === "done");
    if (!done.length) return null;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const result = await summarizeConversation(
        done.map((e) => ({ source: e.source, translated: e.translated, speakerName: e.speakerName })),
        sourceLang,
        targetLang
      );
      if (seq !== summarySeqRef.current) return null;
      setSummary(result);
      return result;
    } catch {
      if (seq !== summarySeqRef.current) return null;
      setSummaryError("Couldn't generate a summary — please try again.");
      return null;
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
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "error", errorStage: "translation" } : e))
      );
    }
  };

  // Transcribes AND translates in one Gemini call (see transcriptions.service
  // on the backend) — cuts both latency and quota usage roughly in half
  // versus a separate /translate round trip. Same 429-backoff treatment as
  // translateEntry — bursty Khmer segments can plausibly hit the rate limit
  // the same way continuous speech does for translate.
  const transcribeSegment = async (id: number, audioBlob: Blob, mimeType: string, attempt = 0) => {
    try {
      const result = await transcribeAudio(audioBlob, mimeType, sourceLang, targetLang);
      if (!result.transcript) {
        // Gemini agreed this segment wasn't real speech (a false VAD
        // trigger) — drop the placeholder instead of showing a junk entry.
        setEntries((prev) => prev.filter((e) => e.id !== id));
        return;
      }
      if (!result.translatedText) {
        // Transcript came back but the translation half didn't (backend
        // already retries this once via a plain-text fallback before giving
        // up — see transcriptions.service). Keep the transcript that DID
        // succeed visible and retryable as a translation-only redo instead
        // of discarding it and re-transcribing from scratch, which would be
        // wasteful and could nondeterministically produce different text.
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, source: result.transcript, status: "error", errorStage: "translation", audioBlob: undefined }
              : e
          )
        );
        return;
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, source: result.transcript, translated: result.translatedText, status: "done", audioBlob: undefined }
            : e
        )
      );
    } catch (err) {
      if (err instanceof TranscribeError && err.status === 429 && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
        transcribeSegment(id, audioBlob, mimeType, attempt + 1);
        return;
      }
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "error", errorStage: "transcription" } : e))
      );
    }
  };

  // Called every time a new sentence finishes translating — regenerates the
  // live nudge from the full transcript so far, tracking the conversation's
  // topic as it moves. Stays on screen continuously (never hidden just
  // because the user is talking) until the next update replaces it or the
  // session ends.
  // Runs off the reactive `entries` state (not entriesRef) specifically
  // because it must see a just-completed sentence on the SAME update that
  // produced it — reading entriesRef here (as translateEntry/transcribeSegment
  // do for other purposes) would see the pre-update snapshot, since a ref
  // assigned during render doesn't reflect a setEntries call made moments
  // earlier in the same synchronous handler. An effect keyed on `entries`
  // only runs after React commits the new state, so it's always current.
  useEffect(() => {
    const done = entries.filter((e): e is TranscriptEntry & { translated: string } => e.status === "done");
    if (!done.length || done.length === lastNextStepDoneCountRef.current) return;
    // Throttle: skip this update if the last one fired too recently — the
    // next completed sentence will re-check and catch up once the window
    // has passed, so content is never permanently missed, just delayed.
    if (Date.now() - lastNextStepCallAtRef.current < MIN_NEXT_STEP_INTERVAL_MS) return;
    lastNextStepDoneCountRef.current = done.length;
    lastNextStepCallAtRef.current = Date.now();

    const seq = ++nextStepSeqRef.current;
    void (async () => {
      try {
        const result = await getNextStep(
          done.map((e) => ({ source: e.source, translated: e.translated })),
          sourceLang
        );
        // A later call may have already resolved and shown something newer —
        // don't let a slow, stale response overwrite it.
        if (seq !== nextStepSeqRef.current) return;
        setNextStepSuggestions(result.suggestions);
      } catch {
        // Nice-to-have nudge, not a critical path — fail silently rather than
        // adding another error/retry surface. Leaves whatever was showing.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, sourceLang]);

  const resetNextStep = () => {
    nextStepSeqRef.current++;
    setNextStepSuggestions([]);
    lastNextStepDoneCountRef.current = 0;
    lastNextStepCallAtRef.current = 0;
  };

  const retryEntry = (entry: TranscriptEntry) => {
    if (entry.errorStage === "transcription" && entry.audioBlob) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "transcribing" } : e)));
      transcribeSegment(entry.id, entry.audioBlob, entry.audioMimeType ?? "audio/webm");
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "translating" } : e)));
    translateEntry(entry.id, entry.source);
  };

  const startListening = () => {
    setStatus("listening");
    setInterimText("");
    setSpeaking(false);
    setErrorMsg(null);
    // Resuming after a summary was already shown (or one was still being
    // generated) makes it stale — it'll be regenerated next time they stop.
    summarySeqRef.current++;
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);
    resetNextStep();
    utteranceWindowStartRef.current = Date.now();

    if (usesGeminiTranscription) {
      void startGemini(sourceLang, {
        onSegmentReady: (audioBlob, mimeType) => {
          setSpeaking(false);
          const id = ++entryIdRef.current;
          const speaker = detectSpeaker();
          setEntries((prev) => [
            ...prev,
            {
              id,
              source: "",
              translated: null,
              status: "transcribing",
              audioBlob,
              audioMimeType: mimeType,
              speakerId: speaker.id,
              speakerName: speaker.name,
              speakerColor: speaker.color,
            },
          ]);
          transcribeSegment(id, audioBlob, mimeType);
        },
        onListeningChange: (isSpeaking) => setSpeaking(isSpeaking),
        onError: (message) => {
          setErrorMsg(message);
          setStatus("idle");
        },
      });
      return;
    }

    start(LANGUAGE_SPEECH_CODES[sourceLang] ?? "en-US", {
      onInterim: (transcript) => setInterimText(transcript),
      onFinal: (transcript) => {
        setInterimText("");
        const id = ++entryIdRef.current;
        const speaker = detectSpeaker();
        setEntries((prev) => [
          ...prev,
          {
            id,
            source: transcript,
            translated: null,
            status: "translating",
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerColor: speaker.color,
          },
        ]);
        translateEntry(id, transcript);
      },
      onError: (message) => {
        setErrorMsg(message);
        setStatus("idle");
      },
    });
  };

  // Clears the transcript back to a pristine idle state — shared by "Don't
  // save" and a successful "Save to history" (nothing left to keep showing
  // once it's safely persisted), matching the guest ExitModal's discard.
  const clearSession = () => {
    setEntries([]);
    setInterimText("");
    setStatus("idle");
    summarySeqRef.current++;
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);
  };

  const stopListening = () => {
    if (usesGeminiTranscription) stopGemini();
    else stopSpeech();
    setInterimText("");
    setSpeaking(false);
    setStatus("idle");
    resetNextStep();
    if (entriesRef.current.length === 0) return;
    // Signed-in users get asked what to do with the session (it can
    // actually be saved); guests just get the existing in-session summary —
    // saving for them happens later if/when they choose to sign in (see the
    // screen's guest ExitModal flow, if it has one).
    if (user) setShowSaveModal(true);
    else finishAndSummarize();
  };

  const handleSaveSession = async () => {
    setSavingSession(true);
    const result = await finishAndSummarize();
    const done = entriesRef.current.filter((e): e is TranscriptEntry & { translated: string } => e.status === "done");
    const success = await onSaveSession({
      sourceLang,
      targetLang,
      exchanges: done.map((e) => ({ source: e.source, translated: e.translated })),
      summary: result?.summary,
      nextSteps: result?.nextSteps,
      title: sessionTitle,
    });
    setSavingSession(false);
    setShowSaveModal(false);
    if (!success) {
      toast.error("Couldn't save this session — please try again.");
      return; // leave the transcript in place so they can retry
    }
    toast.success("Saved to your translation history");
    clearSession();
  };

  const handleDiscardSession = () => {
    setShowSaveModal(false);
    clearSession();
  };

  const handleContinueSession = () => {
    setShowSaveModal(false);
    startListening();
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
    setSpeaking(false);
    resetNextStep();
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
    setSpeaking(false);
    resetNextStep();
    setErrorMsg(null);
    setStatus("idle");
    setSummary(null);
    setSummaryError(null);
    setSummarizing(false);
  };

  useEffect(() => {
    return () => {
      stopSpeech();
      stopGemini();
      resetNextStep();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSpeech, stopGemini]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, interimText, speaking, summary]);

  const hasContent = entries.length > 0;

  return {
    sourceLang,
    targetLang,
    changeLanguage,
    swapLanguages,
    interimText,
    entries,
    status,
    errorMsg,
    hasContent,
    usesGeminiTranscription,
    listening,
    startListening,
    stopListening,
    toggleListening,
    retryEntry,
    clearSession,
    speakers,
    editingSpeakerId,
    editingName,
    setEditingName,
    startRenameSpeaker,
    commitRenameSpeaker,
    cancelRenameSpeaker,
    removeSpeaker,
    summary,
    summarizing,
    summaryError,
    finishAndSummarize,
    nextStepSuggestions,
    scrollRef,
    showSaveModal,
    savingSession,
    handleSaveSession,
    handleDiscardSession,
    handleContinueSession,
    speaking,
  };
}

export type LiveInterpreter = ReturnType<typeof useLiveInterpreter>;

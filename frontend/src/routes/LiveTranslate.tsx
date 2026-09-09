import { useState, useEffect, useRef } from "react";
import { ArrowLeftRight, Cast, Check, CheckSquare, Copy, ListChecks, Maximize2, Mic, MicOff, Minimize2, Pencil, RotateCcw, ShieldCheck, Sparkles, Tag, Users, X } from "lucide-react";
import { toast } from "sonner";
import { UserAccount } from "@/types";
import type { PendingConversation } from "@/App";
import { GEMINI_TRANSCRIPTION_LANGUAGES, LANGUAGE_SPEECH_CODES, SPEAKER_COLORS } from "@/lib/api/utils/constant";
import { quickTranslate, TranslateError } from "@/lib/api/translate";
import { transcribeAudio, TranscribeError } from "@/lib/api/transcribe";
import { summarizeConversation, type SummaryResult } from "@/lib/api/summarize";
import { getNextStep } from "@/lib/api/nextStep";
import { createConversation, startConversation } from "@/lib/api/conversations";
import { createSubtitleSession, updateSubtitleSession, endSubtitleSession, pushSubtitleText } from "@/lib/api/subtitles";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useGeminiTranscription } from "@/hooks/useGeminiTranscription";
import { matchOrCreateSpeaker, type DetectedSpeaker } from "@/lib/speakerDetection";
import BotanicalLeft from "@/components/ui/common/BotanicalLeft";
import BotanicalRight from "@/components/ui/common/BotanicalRight";
import Logo from "@/components/ui/common/Logo";
import ExitModal from "@/components/ui/features/translation/ExitModal";
import SaveSessionModal from "@/components/ui/features/translation/SaveSessionModal";
import AudioVisualizer from "@/components/ui/features/translation/AudioVisualizer";
import UserNav from "@/components/ui/layout/UserNav";
import NotificationBell from "@/components/ui/layout/NotificationBell";
import LanguageSelect from "@/components/ui/features/translation/LanguageSelect";

// Minimum time between live "next step" suggestion calls, so fast
// back-to-back sentences don't each spend a Gemini call.
const MIN_NEXT_STEP_INTERVAL_MS = 15000;

interface TranscriptEntry {
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

export default function LiveTranslatePage({
  sourceLang: initialSourceLang,
  targetLang: initialTargetLang,
  autoStart,
  onAutoStartConsumed,
  user,
  isSignedIn,
  onSaveSession,
  onGoAbout,
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
  // choice in the stop-session prompt below (see stopListening).
  onSaveSession: (pending: PendingConversation) => Promise<boolean>;
  onGoAbout: () => void;
  onGoSignIn: (conv?: {
    sourceLang: string;
    targetLang: string;
    exchanges: { source: string; translated: string }[];
    summary?: string[];
    nextSteps?: string[];
    actionItems?: string[];
    keywords?: string[];
    speakerSummaries?: { speaker: string; summary: string }[];
  }) => void;
  onGoSignUp: () => void;
  onGoHistory: () => void;
  onGoDashboard: () => void;
  onGoSettings: () => void;
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
  // Shown when a signed-in user taps the mic to stop a session that has
  // content (see stopListening) — distinct from showExitModal, which is the
  // guest "sign in to save" prompt shown when leaving the page instead.
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  // the session ends. Only ever shown while listening (see the render
  // below) — hidden the moment the mic closes, unlike the Summary panel's
  // version which is the point-in-time end-of-session recap. Refreshes as
  // new sentences finish, so it tracks the conversation as it moves — but no
  // more than once per MIN_NEXT_STEP_INTERVAL_MS, so fast back-to-back
  // sentences don't each burn a Gemini call.
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

  const commitRenameSpeaker = () => {
    const id = editingSpeakerId;
    const name = editingName.trim();
    setEditingSpeakerId(null);
    if (!id || !name) return;
    const updated = speakers.map((s) => (s.id === id ? { ...s, name } : s));
    speakersRef.current = updated;
    setSpeakers(updated);
  };

  // Live subtitles / "second display" (FR-3) — signed-in only, since a
  // shareable session needs a real backend Conversation to hang off. Kept
  // in a ref (not just state) so translateEntry/transcribeSegment, defined
  // once, always see whether a session is currently active.
  const [subtitleSession, setSubtitleSession] = useState<{
    conversationId: string;
    sessionCode: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
  } | null>(null);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [startingSubtitles, setStartingSubtitles] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const subtitleSessionRef = useRef(subtitleSession);
  subtitleSessionRef.current = subtitleSession;
  const subtitlePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (subtitlePanelRef.current && !subtitlePanelRef.current.contains(e.target as Node)) setSubtitlePanelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const startSubtitles = async () => {
    setStartingSubtitles(true);
    try {
      const conversation = await createConversation(sourceLang, targetLang);
      await startConversation(conversation.id);
      const session = await createSubtitleSession(conversation.id, {
        fontSize: 32,
        fontColor: "#FFFFFF",
        backgroundColor: "#000000",
      });
      setSubtitleSession({
        conversationId: conversation.id,
        sessionCode: session.sessionCode,
        fontSize: session.fontSize,
        fontColor: session.fontColor,
        backgroundColor: session.backgroundColor,
      });
    } catch {
      setErrorMsg("Couldn't start a subtitle session — please try again.");
    } finally {
      setStartingSubtitles(false);
    }
  };

  const stopSubtitles = async () => {
    const session = subtitleSessionRef.current;
    setSubtitleSession(null);
    setSubtitlePanelOpen(false);
    if (session) await endSubtitleSession(session.conversationId).catch(() => {});
  };

  const updateSubtitleDisplay = (patch: Partial<{ fontSize: number; fontColor: string; backgroundColor: string }>) => {
    const session = subtitleSessionRef.current;
    if (!session) return;
    setSubtitleSession({ ...session, ...patch });
    void updateSubtitleSession(session.conversationId, patch).catch(() => {});
  };

  const subtitleLink = subtitleSession
    ? `${window.location.origin}${window.location.pathname}?subtitles=${subtitleSession.sessionCode}`
    : "";

  const copySubtitleLink = async () => {
    if (!subtitleLink) return;
    try {
      await navigator.clipboard.writeText(subtitleLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard access can be denied/unavailable — the code is still
      // visible on screen for the user to copy by hand.
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
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
      if (subtitleSessionRef.current) {
        const speakerName = entriesRef.current.find((e) => e.id === id)?.speakerName;
        void pushSubtitleText(subtitleSessionRef.current.conversationId, {
          source,
          translated: result.translatedText,
          speakerName,
        });
      }
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
      if (subtitleSessionRef.current) {
        const speakerName = entriesRef.current.find((e) => e.id === id)?.speakerName;
        void pushSubtitleText(subtitleSessionRef.current.conversationId, {
          source: result.transcript,
          translated: result.translatedText,
          speakerName,
        });
      }
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
    // saving for them happens later if/when they choose to sign in (see
    // ExitModal's guest flow, triggered from the header's Sign-in button).
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
      actionItems: result?.actionItems,
      keywords: result?.keywords,
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
      if (subtitleSessionRef.current) {
        void endSubtitleSession(subtitleSessionRef.current.conversationId).catch(() => {});
      }
    };
  }, [stopSpeech, stopGemini]);

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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, interimText, speaking, summary]);

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
            <div className="relative" ref={subtitlePanelRef}>
              <button
                onClick={() => setSubtitlePanelOpen((o) => !o)}
                aria-label="Live subtitles"
                className={`transition-colors p-1.5 -m-1.5 ${subtitleSession ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Cast size={17} />
              </button>
              {subtitlePanelOpen && (
                <div
                  className="absolute right-0 top-full mt-3 w-72 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50 p-4"
                  style={{ animation: "fadeSlideUp 0.2s ease-out" }}
                >
                  <p className="text-sm font-semibold text-foreground mb-1">Live subtitles</p>
                  <p className="text-xs text-muted-foreground mb-4">Show captions on a second screen in real time.</p>
                  {!subtitleSession ? (
                    <button
                      onClick={startSubtitles}
                      disabled={startingSubtitles}
                      className="w-full bg-primary text-primary-foreground py-2.5 rounded-full text-sm font-semibold hover:bg-accent disabled:opacity-50 transition-colors duration-200"
                    >
                      {startingSubtitles ? "Starting…" : "Start subtitle session"}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">
                          Share this link
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={subtitleLink}
                            onFocus={(e) => e.target.select()}
                            className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none"
                          />
                          <button
                            onClick={copySubtitleLink}
                            aria-label="Copy link"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        <p className="text-[10px] font-['DM_Mono'] tracking-wide text-muted-foreground/70 mt-1.5">
                          Code: {subtitleSession.sessionCode}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                          Font size ({subtitleSession.fontSize}px)
                        </label>
                        <input
                          type="range"
                          min={16}
                          max={64}
                          value={subtitleSession.fontSize}
                          onChange={(e) => updateSubtitleDisplay({ fontSize: Number(e.target.value) })}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div className="flex items-center gap-5">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Text
                          <input
                            type="color"
                            value={subtitleSession.fontColor}
                            onChange={(e) => updateSubtitleDisplay({ fontColor: e.target.value })}
                            className="w-7 h-7 rounded border border-border cursor-pointer"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Background
                          <input
                            type="color"
                            value={subtitleSession.backgroundColor}
                            onChange={(e) => updateSubtitleDisplay({ backgroundColor: e.target.value })}
                            className="w-7 h-7 rounded border border-border cursor-pointer"
                          />
                        </label>
                      </div>
                      <button
                        onClick={stopSubtitles}
                        className="w-full border border-border text-foreground py-2 rounded-full text-sm font-medium hover:bg-secondary transition-colors duration-200"
                      >
                        Stop subtitle session
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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

      {/* Speaker identification (FR-8): automatically detected from voice
          pitch as each utterance finishes — nothing to select beforehand.
          Rename a chip to correct a label or give someone their real name;
          remove one to drop a mis-detected phantom speaker. */}
      {speakers.length > 0 && (
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
                  if (e.key === "Escape") setEditingSpeakerId(null);
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
              {entries.map((entry) => (
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
                          <RotateCcw size={13} />
                          {entry.errorStage === "transcription" ? "Transcription failed — tap to retry" : "Translation failed — tap to retry"}
                        </button>
                      ) : (
                        <p className="font-['Playfair_Display'] font-bold italic text-xl md:text-2xl text-accent leading-relaxed mt-1">
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
                <p className="font-['Playfair_Display'] text-lg md:text-xl text-foreground/50 leading-relaxed italic">
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

                  {summary.actionItems.length > 0 && (
                    <>
                      <div className="h-px bg-border/50" />
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2.5">
                          <CheckSquare size={13} /> Action items
                        </p>
                        <ul className="flex flex-col gap-2">
                          {summary.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                              <span className="w-3.5 h-3.5 rounded border border-border/80 flex-shrink-0 mt-1" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {summary.keywords.length > 0 && (
                    <>
                      <div className="h-px bg-border/50" />
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-['DM_Mono'] tracking-[0.15em] uppercase text-muted-foreground mb-2.5">
                          <Tag size={13} /> Keywords
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {summary.keywords.map((keyword, i) => (
                            <span
                              key={i}
                              className="text-xs text-foreground/70 bg-secondary/60 border border-border/50 rounded-full px-2.5 py-1"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

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

        {listening && nextStepSuggestions.length > 0 && (
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
                    exchanges: done.map((e) => ({ source: e.source, translated: e.translated })),
                    summary: summary?.summary,
                    nextSteps: summary?.nextSteps,
                    actionItems: summary?.actionItems,
                    keywords: summary?.keywords,
                    speakerSummaries: summary?.speakerSummaries,
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

      {showSaveModal && (
        <SaveSessionModal
          saving={savingSession}
          onSave={handleSaveSession}
          onDiscard={handleDiscardSession}
          onContinue={handleContinueSession}
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
    </div>
  );
}
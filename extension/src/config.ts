// Points at the local dev backend — update before publishing anywhere real
// (and add that origin to manifest.json's host_permissions; MV3 requires an
// explicit host, "<all_urls>" would trigger a much scarier install prompt
// for no benefit here since we only ever call our own API).
export const API_URL = "http://localhost:4000/api/v1";
export const WEB_APP_URL = "http://localhost:5173";

// Mirrors frontend/src/lib/api/utils/constant.ts's LANGUAGES/LANGUAGE_SPEECH_CODES —
// duplicated rather than imported so this package builds independently of
// the frontend workspace.
export const LANGUAGES = [
  "English",
  "Khmer",
  "Japanese",
  "Chinese",
  "Korean",
  "Vietnamese",
  "French",
  "Spanish",
  "German",
  "Portuguese",
  "Russian",
  "Arabic",
  "Hindi",
  "Indonesian",
];

export const LANGUAGE_SPEECH_CODES: Record<string, string> = {
  English: "en-US",
  Khmer: "km-KH",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Vietnamese: "vi-VN",
  French: "fr-FR",
  Spanish: "es-ES",
  German: "de-DE",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
  Arabic: "ar-SA",
  Hindi: "hi-IN",
  Indonesian: "id-ID",
};

export const DEFAULT_TARGET_LANGUAGE = "Khmer";
export const STORAGE_KEY_TARGET_LANGUAGE = "fluentTargetLanguage";

// Mirrors backend/src/modules/translations/translations.validator.ts's
// lookupSchema text cap — checked client-side (highlight-to-translate and
// clipboard translation both hit this same endpoint) so a too-long
// selection/clipboard gets a clear reason instead of round-tripping to the
// server just to receive a bare "Translation failed (400)".
export const MAX_LOOKUP_TEXT_LENGTH = 500;

// "Speaking" language for the live tab-audio interpreter — separate from the
// lookup/highlight path above, which doesn't need one (it lets Gemini
// auto-detect from the selected text). /transcribe has no such auto-detect
// handling (see backend transcriptions.service.ts), so this has to be a real
// pick, mirroring the main app's "Speaking" selector.
export const DEFAULT_SOURCE_LANGUAGE = "English";
export const STORAGE_KEY_SOURCE_LANGUAGE = "fluentSourceLanguage";

// Mirrors frontend/src/hooks/useGeminiTranscription.ts's volume-based VAD —
// duplicated (not imported) for the same reason the rest of this file is:
// the extension builds independently of the frontend workspace. Ported to
// plain DOM APIs for extension/src/offscreen.ts, which has no React runtime.
// Slightly more sensitive than the frontend mic hook's 0.02 — tab/video
// audio (already mixed/mastered, sometimes at a lower system volume) can run
// quieter than a mic held close to someone's mouth.
export const VAD_VOLUME_THRESHOLD = 0.012; // RMS, 0-1 scale
export const VAD_SILENCE_DURATION_MS = 500; // pause length that ends an utterance
export const VAD_MIN_SPEECH_DURATION_MS = 300; // cumulative above-threshold time to count as real speech
export const VAD_MAX_SEGMENT_DURATION_MS = 15000; // hard cap so one utterance can't grow unbounded
export const VAD_POLL_INTERVAL_MS = 50;
export const VAD_HIGHPASS_CUTOFF_HZ = 90; // just below the speech fundamental range
export const VAD_MIME_TYPE_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

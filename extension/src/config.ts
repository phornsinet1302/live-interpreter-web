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

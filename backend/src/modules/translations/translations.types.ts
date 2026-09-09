export interface CreateMessageInput {
  speakerId?: string;
  originalText: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface TranslateResult {
  translatedText: string;
  provider: string;
  confidence: number | null;
}

// Richer than TranslateResult — used by the browser extension's word/phrase
// popover (see /translate/lookup). phonetic/examples are only meaningful
// for a single word or short phrase; a longer passage selection gets them
// back empty rather than something contrived.
export interface LookupResult {
  translatedText: string;
  phonetic: string | null;
  examples: string[];
  provider: string;
  confidence: number | null;
}

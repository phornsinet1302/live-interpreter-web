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

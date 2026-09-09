export interface TranscribeResult {
  transcript: string;
  translatedText: string;
  provider: string;
  confidence: number | null;
}

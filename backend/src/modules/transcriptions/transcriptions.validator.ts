import { z } from "zod";

// Unauthenticated, not tied to a conversation — used by the live-translate
// demo's Khmer speech path (see LiveTranslate.tsx's useGeminiTranscription).
// Base64 length is capped generously for a <=20s opus clip; mimeType is
// whatever MediaRecorder.isTypeSupported picked in the browser.
export const quickTranscribeSchema = z.object({
  audio: z.string().min(1).max(8_000_000),
  mimeType: z.string().min(3).max(100),
  sourceLanguage: z.string().min(2).max(30),
  targetLanguage: z.string().min(2).max(30),
});
export type QuickTranscribeInput = z.infer<typeof quickTranscribeSchema>;

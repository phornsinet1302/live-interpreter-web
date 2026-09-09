// Service -> business rules & orchestration. No req/res.
import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import { translateText } from "../translations/translations.service";
import type { TranscribeResult } from "./transcriptions.types";

const TRANSCRIPTION_PROVIDER = "vertex-gemini";
// gemini-3.6-flash has only a 20-requests/day free-tier quota on this
// project; gemini-3.5-flash-lite is a separate, much less constrained quota
// bucket and handles audio input + our JSON-response prompt shape the same way.
const TRANSCRIPTION_MODEL = "gemini-3.5-flash-lite";

// Transcribes AND translates in a single Gemini call — a separate /translate
// round trip after this would double both latency and quota usage for no
// benefit, since the model can produce both from the same audio pass.
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranscribeResult> {
  try {
    const response = await gemini.models.generateContent({
      model: TRANSCRIPTION_MODEL,
      contents: [
        { text: `Source language: ${sourceLanguage}\nTarget language: ${targetLanguage}` },
        { inlineData: { mimeType, data: audioBase64 } },
      ],
      config: {
        systemInstruction:
          `You are a professional interpreter. First transcribe the spoken audio exactly as spoken, in ${sourceLanguage}'s ` +
          `native script — do not paraphrase or add commentary. Then translate that transcript into ${targetLanguage}. ` +
          "If the audio contains no discernible speech (silence, background noise, or non-speech sounds only), " +
          "respond with empty strings for both fields. Respond ONLY with JSON of the shape " +
          '{"transcript": string, "translatedText": string, "confidence": number between 0 and 1}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { transcript?: string; translatedText?: string; confidence?: number };
    if (typeof parsed.transcript !== "string") throw new Error("Missing transcript in completion");

    const transcript = parsed.transcript.trim();
    let translatedText = typeof parsed.translatedText === "string" ? parsed.translatedText.trim() : "";

    // The single combined call occasionally transcribes fine but comes back
    // with an empty translatedText — short utterances and cross-talk seem
    // most prone to it, likely the model treating the two instructions
    // (transcribe, then translate) as separable and skipping the second for
    // audio it finds ambiguous. Rather than surface that as a hard failure
    // and force the caller to redo the whole transcription (nondeterministic
    // — it could transcribe differently the second time), fall back to the
    // plain text-translate path for the transcript we already have.
    if (transcript && !translatedText) {
      try {
        translatedText = (await translateText(transcript, sourceLanguage, targetLanguage)).translatedText;
      } catch (fallbackError) {
        logger.error("Translation fallback after empty combined result also failed", fallbackError);
      }
    }

    return {
      transcript,
      translatedText,
      provider: TRANSCRIPTION_PROVIDER,
      confidence:
        typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
    };
  } catch (error) {
    logger.error("Transcription request failed", error);
    throw new ApiError(502, "Transcription service is currently unavailable", "TRANSCRIPTION_FAILED");
  }
}

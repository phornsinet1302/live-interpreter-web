import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { QuickNextStepInput } from "./next-step.validator";
import type { NextStepResult } from "./next-step.types";

// Unauthenticated counterpart to the quick-summarize endpoint, but for the
// live, mid-session nudge (see LiveTranslate.tsx) rather than the
// end-of-session summary — same style of 2-4 concrete suggestions as that
// summary's "nextSteps" list, just recomputed as the conversation grows
// instead of waiting until it ends. Always in the speaker's own language —
// the frontend caches the result and only re-calls this when the transcript
// has actually grown, so a real conversation's many silent pauses don't each
// burn a Gemini call.
export async function generateNextStep({
  exchanges,
  sourceLanguage,
}: QuickNextStepInput): Promise<NextStepResult> {
  const transcript = exchanges.map((e) => `${sourceLanguage}: ${e.source}`).join("\n");

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: transcript,
      config: {
        systemInstruction:
          `The main speaker in this in-progress conversation transcript (spoken in ${sourceLanguage}) is talking to ` +
          "someone else and might go quiet or get stuck for words. Suggest 2-4 short, concrete lines they could say " +
          `OUT LOUD TO THE OTHER PERSON right now to keep going, in ${sourceLanguage} — things to say, not things to ` +
          "ask the main speaker. Never phrase a suggestion as a question addressed back to the main speaker (e.g. " +
          '"Do you want me to explain that?" or "Is there anything else I can help with?") and never offer meta ' +
          "assistance — you are not a participant in this conversation, only ghostwriting the next line for the " +
          "person who is. Base each suggestion on the actual content already discussed; skip generic advice. One " +
          'short sentence each, no preamble. Respond ONLY with JSON of the shape {"suggestions": string[]}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { suggestions?: string[] };
    if (!Array.isArray(parsed.suggestions)) throw new Error("Missing suggestions in completion");

    return { suggestions: parsed.suggestions.map((s) => s.trim()).filter(Boolean) };
  } catch (error) {
    logger.error("Next-step suggestion generation failed", error);
    throw new ApiError(502, "Next-step suggestion is currently unavailable", "NEXT_STEP_FAILED");
  }
}

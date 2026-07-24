// AI summary generation — isolated from the service's DB orchestration so
// the prompt/model can change without touching business logic.
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";

export interface GeneratedSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  keywords: string[];
}

const SYSTEM_PROMPT =
  "You summarize interpreted conversation transcripts. Given a list of translated " +
  "sentences, return a JSON object with exactly these keys: " +
  '"summary" (a short paragraph), "keyPoints" (string array), ' +
  '"actionItems" (string array, tasks or follow-ups mentioned, may be empty), ' +
  '"keywords" (string array of notable topics/terms). Reply with JSON only.';

export async function generateSummary(transcript: string): Promise<GeneratedSummary> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<GeneratedSummary>;

    return {
      summary: parsed.summary ?? "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (err) {
    logger.error("Summary generation failed", { error: String(err) });
    throw err;
  }
}

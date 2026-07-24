// AI-generated follow-up suggestions — isolated from the service's DB orchestration.
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";

export interface GeneratedSuggestion {
  suggestion: string;
  priority: "low" | "medium" | "high";
}

const SYSTEM_PROMPT =
  "You read interpreted conversation transcripts and propose concrete follow-up " +
  "actions for the participants. Return a JSON object: " +
  '{ "suggestions": [{ "suggestion": string, "priority": "low"|"medium"|"high" }] }. ' +
  "Return at most 5 suggestions. Reply with JSON only.";

export async function generateSuggestions(transcript: string): Promise<GeneratedSuggestion[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { suggestions?: GeneratedSuggestion[] };
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch (err) {
    logger.error("Suggestion generation failed", { error: String(err) });
    throw err;
  }
}

// The actual translation call — isolated so the provider (OpenAI today) can
// be swapped without touching the service's orchestration logic.
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";

export const TRANSLATION_PROVIDER = "openai";

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            `You are a real-time interpreter. Translate the user's message from ` +
            `${sourceLanguage} to ${targetLanguage}. Reply with only the translation, ` +
            `no explanations or quotes.`,
        },
        { role: "user", content: text },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || text;
  } catch (err) {
    logger.error("Translation provider call failed", { error: String(err) });
    throw err;
  }
}

import * as repo from "./summaries.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { openai } from "../../lib/openai";
import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { QuickSummaryInput } from "./summaries.validator";

interface GeneratedSummary {
  summary: string;
  keyPoints: string[];
  actionItems: { text: string }[];
  keywords: string[];
}

export interface QuickSummaryResult {
  summary: string[];
  nextSteps: string[];
}

// Unauthenticated counterpart to createOrRegenerateSummary — takes the
// transcript directly instead of loading it from a persisted conversation,
// and uses Gemini (like quick-translate) rather than OpenAI so it works
// under the same ADC auth with no API key required.
export async function quickSummarize({
  exchanges,
  sourceLanguage,
  targetLanguage,
}: QuickSummaryInput): Promise<QuickSummaryResult> {
  const transcript = exchanges
    .map((e) => `${sourceLanguage}: ${e.source}\n${targetLanguage}: ${e.translated}`)
    .join("\n\n");

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: transcript,
      config: {
        systemInstruction:
          `You are summarizing a translated conversation between ${sourceLanguage} and ${targetLanguage} speakers. ` +
          `Write your response in ${targetLanguage}. ` +
          "Produce a short summary of what was discussed as 2-5 bullet points, and 2-4 concrete, actionable next steps " +
          "the participants should take based on what was said (skip generic advice — base them on the actual content). " +
          'Respond ONLY with JSON of the shape {"summary": string[], "nextSteps": string[]}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { summary?: string[]; nextSteps?: string[] };
    return { summary: parsed.summary ?? [], nextSteps: parsed.nextSteps ?? [] };
  } catch (error) {
    logger.error("Quick summary generation failed", error);
    throw new ApiError(502, "Summary generation is currently unavailable", "SUMMARY_FAILED");
  }
}

async function generate(conversationId: string): Promise<GeneratedSummary> {
  const messages = await repo.findMessagesForConversation(conversationId);
  if (messages.length === 0) {
    throw ApiError.badRequest("This conversation has no messages to summarize yet");
  }

  const transcript = messages
    .map((m) => `Original: ${m.originalText}\nTranslated: ${m.translatedText}`)
    .join("\n\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Summarize the following interpreted conversation transcript. Respond ONLY with JSON of the shape " +
            '{"summary": string, "keyPoints": string[], "actionItems": [{"text": string}], "keywords": string[]}.',
        },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty completion");
    return JSON.parse(raw) as GeneratedSummary;
  } catch (error) {
    logger.error("Summary generation failed", error);
    throw new ApiError(502, "Summary generation is currently unavailable", "SUMMARY_FAILED");
  }
}

export async function createOrRegenerateSummary(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const result = await generate(conversationId);
  return repo.upsert(conversationId, {
    summary: result.summary,
    keyPoints: result.keyPoints ?? [],
    actionItems: result.actionItems ?? [],
    keywords: result.keywords ?? [],
  });
}

export async function getSummary(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const summary = await repo.findByConversation(conversationId);
  if (!summary) throw ApiError.notFound("No summary has been generated for this conversation yet");
  return summary;
}

export async function deleteSummary(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  await repo.remove(conversationId);
}

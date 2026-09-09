import * as repo from "./summaries.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { openai } from "../../lib/openai";
import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { QuickSummaryInput, SaveSummaryInput } from "./summaries.validator";

interface GeneratedSummary {
  summary: string;
  keyPoints: string[];
  actionItems: { text: string }[];
  keywords: string[];
}

export interface QuickSummaryResult {
  summary: string[];
  nextSteps: string[];
  actionItems: string[];
  keywords: string[];
  speakerSummaries: { speaker: string; summary: string }[];
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
    .map((e) => {
      const who = e.speakerName ?? sourceLanguage;
      return `${who} (${sourceLanguage}): ${e.source}\n${who} (${targetLanguage} translation): ${e.translated}`;
    })
    .join("\n\n");

  // Only worth asking for a per-speaker breakdown when there's more than
  // one named speaker — otherwise it'd just restate the overall summary.
  const speakers = Array.from(new Set(exchanges.map((e) => e.speakerName).filter((s): s is string => !!s)));
  const speakerInstruction =
    speakers.length > 1
      ? `Also produce a one-to-two-sentence summary of what each of these speakers specifically said or contributed: ${speakers.join(", ")} ("speakerSummaries", an array of {"speaker": string, "summary": string}, one entry per speaker listed). `
      : 'Leave "speakerSummaries" as an empty array — there is only one identified speaker. ';

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: transcript,
      config: {
        systemInstruction:
          `You are summarizing a translated conversation between ${sourceLanguage} and ${targetLanguage} speakers. ` +
          `Write your response in ${sourceLanguage} — the main speaker's own language, not the translation. ` +
          "Produce a short summary of what was discussed as 2-5 bullet points (\"summary\"); 2-4 concrete, actionable " +
          "next steps the participants should take based on what was said (\"nextSteps\"); 2-5 concrete action items " +
          "or commitments made during the discussion, phrased as tasks (\"actionItems\"); and 3-8 important keywords " +
          "or topics from the conversation (\"keywords\"). Skip generic advice — base everything on the actual content. " +
          speakerInstruction +
          'Respond ONLY with JSON of the shape {"summary": string[], "nextSteps": string[], "actionItems": string[], ' +
          '"keywords": string[], "speakerSummaries": [{"speaker": string, "summary": string}]}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as {
      summary?: string[];
      nextSteps?: string[];
      actionItems?: string[];
      keywords?: string[];
      speakerSummaries?: { speaker: string; summary: string }[];
    };
    return {
      summary: parsed.summary ?? [],
      nextSteps: parsed.nextSteps ?? [],
      actionItems: parsed.actionItems ?? [],
      keywords: parsed.keywords ?? [],
      speakerSummaries: parsed.speakerSummaries ?? [],
    };
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

export async function saveSummary(conversationId: string, userId: string, input: SaveSummaryInput) {
  await getConversationForOwner(conversationId, userId);
  return repo.upsert(conversationId, {
    summary: input.summary,
    keyPoints: input.keyPoints,
    actionItems: input.actionItems.map((text) => ({ text })),
    keywords: input.keywords,
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

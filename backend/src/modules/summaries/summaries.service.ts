import * as repo from "./summaries.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";

interface GeneratedSummary {
  summary: string;
  keyPoints: string[];
  actionItems: { text: string }[];
  keywords: string[];
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

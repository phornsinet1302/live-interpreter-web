import * as repo from "./suggestions.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { SuggestionPriority } from "../../lib/prisma-client";

interface GeneratedSuggestion {
  suggestion: string;
  priority: SuggestionPriority;
}

async function generate(conversationId: string): Promise<GeneratedSuggestion[]> {
  const messages = await repo.findMessagesForConversation(conversationId);
  if (messages.length === 0) {
    throw ApiError.badRequest("This conversation has no messages to base suggestions on yet");
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
            "Based on this interpreted conversation transcript, propose concrete follow-up actions. Respond ONLY with " +
            'JSON of the shape {"suggestions": [{"suggestion": string, "priority": "low"|"medium"|"high"|"critical"}]}.',
        },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { suggestions?: GeneratedSuggestion[] };
    return parsed.suggestions ?? [];
  } catch (error) {
    logger.error("Suggestion generation failed", error);
    throw new ApiError(502, "Suggestion generation is currently unavailable", "SUGGESTIONS_FAILED");
  }
}

export async function createSuggestions(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const suggestions = await generate(conversationId);
  await repo.createMany(conversationId, suggestions);
  return repo.findManyByConversation(conversationId);
}

export async function listSuggestions(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  return repo.findManyByConversation(conversationId);
}

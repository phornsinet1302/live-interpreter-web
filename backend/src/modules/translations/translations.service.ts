// Service -> business rules & orchestration. No req/res.
import * as repo from "./translations.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { CreateMessageInput, TranslateResult } from "./translations.types";

const TRANSLATION_PROVIDER = "vertex-gemini";
const TRANSLATION_MODEL = "gemini-2.5-flash";

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslateResult> {
  try {
    const response = await gemini.models.generateContent({
      model: TRANSLATION_MODEL,
      contents: `Source language: ${sourceLanguage}\nTarget language: ${targetLanguage}\nText: ${text}`,
      config: {
        systemInstruction:
          "You are a professional interpreter. Translate the user's message from the source language to the target language. " +
          'Respond ONLY with JSON of the shape {"translatedText": string, "confidence": number between 0 and 1}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { translatedText?: string; confidence?: number };
    if (!parsed.translatedText) throw new Error("Missing translatedText in completion");

    return {
      translatedText: parsed.translatedText,
      provider: TRANSLATION_PROVIDER,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : null,
    };
  } catch (error) {
    logger.error("Translation request failed", error);
    throw new ApiError(502, "Translation service is currently unavailable", "TRANSLATION_FAILED");
  }
}

export async function createMessage(
  conversationId: string,
  userId: string,
  input: CreateMessageInput
) {
  const conversation = await getConversationForOwner(conversationId, userId);
  const sourceLanguage = input.sourceLanguage ?? conversation.sourceLanguage;
  const targetLanguage = input.targetLanguage ?? conversation.targetLanguage;

  const result = await translateText(input.originalText, sourceLanguage, targetLanguage);

  const message = await repo.create({
    conversationId,
    speakerId: input.speakerId ?? null,
    originalText: input.originalText,
    translatedText: result.translatedText,
    sourceLanguage,
    targetLanguage,
    translationProvider: result.provider,
    confidence: result.confidence,
  });

  getIO()?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.MESSAGE_NEW, message);

  return message;
}

export async function listMessages(
  conversationId: string,
  userId: string,
  query: PaginationQuery
) {
  await getConversationForOwner(conversationId, userId);
  const { page, limit, skip, take } = toSkipTake(query);
  const [data, total] = await Promise.all([
    repo.findManyByConversation(conversationId, skip, take),
    repo.countByConversation(conversationId),
  ]);
  return paginated(data, total, page, limit);
}

export async function getMessage(conversationId: string, messageId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const message = await repo.findById(conversationId, messageId);
  if (!message) throw ApiError.notFound("Message not found");
  return message;
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const message = await repo.findById(conversationId, messageId);
  if (!message) throw ApiError.notFound("Message not found");
  await repo.remove(messageId);
}

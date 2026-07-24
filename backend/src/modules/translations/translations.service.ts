// Service -> business rules & orchestration. Calls repository + provider. No req/res.
import { AppError } from "../../utils/app-error";
import { parsePagination } from "../../utils/pagination";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./translations.repository";
import { translateText, TRANSLATION_PROVIDER } from "./translations.provider";
import type { CreateMessageInput, ListMessagesInput } from "./translations.validator";

export async function createMessage(
  conversationId: string,
  user: CurrentUser,
  input: CreateMessageInput
) {
  const conversation = await assertConversationAccess(conversationId, user);
  if (conversation.status === "ended") {
    throw AppError.badRequest("Cannot add messages to a conversation that has ended");
  }

  const sourceLanguage = input.sourceLanguage ?? conversation.sourceLanguage;
  const targetLanguage = input.targetLanguage ?? conversation.targetLanguage;
  const translatedText = await translateText(input.originalText, sourceLanguage, targetLanguage);

  return repo.createMessage({
    conversation: { connect: { id: conversationId } },
    speaker: input.speakerId ? { connect: { id: input.speakerId } } : undefined,
    originalText: input.originalText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    translationProvider: TRANSLATION_PROVIDER,
  });
}

export async function list(conversationId: string, user: CurrentUser, query: ListMessagesInput) {
  await assertConversationAccess(conversationId, user);
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await repo.listByConversation(conversationId, skip, take);
  return { items, meta: { page, limit, total } };
}

export async function getById(conversationId: string, messageId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  const message = await repo.findById(conversationId, messageId);
  if (!message) throw AppError.notFound("Message not found");
  return message;
}

export async function remove(conversationId: string, messageId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  const { count } = await repo.deleteMessage(conversationId, messageId);
  if (count === 0) throw AppError.notFound("Message not found");
}

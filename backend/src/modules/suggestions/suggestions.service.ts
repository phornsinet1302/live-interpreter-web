// Service -> business rules & orchestration. Calls repository + provider. No req/res.
import { AppError } from "../../utils/app-error";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./suggestions.repository";
import { generateSuggestions } from "./suggestions.provider";

export async function generate(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);

  const messages = await repo.listTranscript(conversationId);
  if (messages.length === 0) {
    throw AppError.badRequest("This conversation has no messages to work from yet");
  }

  const transcript = messages
    .map((m) => `${m.originalText}${m.translatedText ? ` (translated: ${m.translatedText})` : ""}`)
    .join("\n");

  const generated = await generateSuggestions(transcript);

  await repo.deleteAllForConversation(conversationId);
  if (generated.length > 0) await repo.createMany(conversationId, generated);

  return repo.listByConversation(conversationId);
}

export async function list(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  return repo.listByConversation(conversationId);
}
